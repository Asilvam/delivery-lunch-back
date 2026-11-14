import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import {
  CustomerSessionRecord,
  CustomerSessionDocument,
} from './customer-session.schema';
import { CustomerDocument } from '../customers/customer.schema';
import {
  CustomersService,
  GoogleIdentity,
} from '../customers/customers.service';
export const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
@Injectable()
export class CustomerSessionService {
  constructor(
    @InjectModel(CustomerSessionRecord.name)
    private readonly sessions: Model<CustomerSessionDocument>,
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
  ) {}
  private response(
    customer: CustomerDocument,
    session: CustomerSessionDocument,
  ) {
    return {
      access_token: this.jwt.sign(
        {
          sub: customer.googleId,
          role: 'customer',
          name: customer.name,
          email: customer.email,
          sid: session._id.toString(),
          version: customer.authVersion,
        },
        { expiresIn: '15m' },
      ),
      customer: {
        googleId: customer.googleId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        contactName: customer.contactName || '',
      },
    };
  }
  async create(identity: GoogleIdentity) {
    const customer = await this.customers.register(identity);
    const refreshToken = randomBytes(32).toString('hex');
    const session = await this.sessions.create({
      tokenHash: tokenHash(refreshToken),
      googleId: identity.googleId,
      authVersion: customer.authVersion,
      expiresAt: new Date(Date.now() + CUSTOMER_SESSION_MS),
      lastUsedAt: new Date(),
    });
    return { ...this.response(customer, session), refreshToken };
  }
  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Inicia sesión con Google.');
    const session = await this.sessions
      .findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } })
      .exec();
    if (!session)
      throw new UnauthorizedException(
        'La sesión recordada venció. Inicia sesión con Google.',
      );
    const customer = await this.customers.active(
      session.googleId,
      session.authVersion,
    );
    // Refresh does not extend the absolute 30-day expiration or create a new order.
    const updated = await this.sessions
      .findOneAndUpdate(
        { _id: session._id, expiresAt: { $gt: new Date() } },
        { $set: { lastUsedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!updated) throw new UnauthorizedException('La sesión fue cerrada.');
    return this.response(customer, updated);
  }
  async validateAccess(googleId: string, sid: string, version: number) {
    if (
      !Types.ObjectId.isValid(sid) ||
      !(await this.sessions.exists({
        _id: sid,
        googleId,
        authVersion: version,
        expiresAt: { $gt: new Date() },
      }))
    )
      throw new UnauthorizedException('La sesión fue cerrada.');
  }
  async revoke(token: string | undefined) {
    if (token)
      await this.sessions.deleteOne({ tokenHash: tokenHash(token) }).exec();
  }
}
