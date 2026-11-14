import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage } from 'mongoose';
import { Customer, CustomerDocument } from './customer.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CustomerBlockDto, CustomerQueryDto } from './customers.dto';
export interface GoogleIdentity {
  googleId: string;
  name: string;
  email: string;
}
export interface CustomerRow {
  googleId: string;
  name: string;
  email: string;
  phone: string;
  blocked: boolean;
  blockReason: string;
  totalOrders: number;
  approvedOrders: number;
  lastOrderAt: Date | null;
}
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
  ) {}
  async register(identity: GoogleIdentity) {
    await this.customers.init();
    let customer: CustomerDocument | null;
    try {
      customer = await this.customers
        .findOneAndUpdate(
          { googleId: identity.googleId },
          {
            $set: {
              name: identity.name,
              email: identity.email,
              lastLoginAt: new Date(),
            },
            $setOnInsert: { blocked: false, authVersion: 0 },
          },
          { upsert: true, new: true },
        )
        .exec();
    } catch (error: unknown) {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ))
        throw error;
      customer = await this.customers
        .findOne({ googleId: identity.googleId })
        .exec();
    }
    if (!customer) throw new UnauthorizedException();
    this.assertAllowed(customer);
    return customer;
  }
  private assertAllowed(customer: Customer) {
    if (customer.blocked)
      throw new ForbiddenException({
        code: 'CUSTOMER_BLOCKED',
        message:
          'Tu cuenta está bloqueada para realizar pedidos. Contacta al local.',
      });
  }
  async active(googleId: string, version?: number) {
    const customer = await this.customers.findOne({ googleId }).exec();
    if (!customer)
      throw new UnauthorizedException('Vuelve a iniciar sesión con Google.');
    this.assertAllowed(customer);
    if (version !== undefined && customer.authVersion !== version)
      throw new UnauthorizedException('La sesión ya no está vigente.');
    return customer;
  }
  async recordOrder(
    googleId: string,
    version: number,
    contactName: string,
    phone: string,
    session: ClientSession,
  ) {
    const customer = await this.customers
      .findOneAndUpdate(
        { googleId, blocked: false, authVersion: version },
        { $set: { contactName, phone }, $inc: { orderWrites: 1 } },
        { session, new: true },
      )
      .exec();
    if (!customer)
      throw new ForbiddenException({
        code: 'CUSTOMER_UNAVAILABLE',
        message:
          'Tu cuenta no está habilitada. Vuelve a iniciar sesión o contacta al local.',
      });
  }
  async list(query: CustomerQueryDto) {
    const literal = query.q?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: Record<string, unknown> = {};
    if (literal)
      filter.$or = ['name', 'email', 'phone'].map((field) => ({
        [field]: { $regex: literal, $options: 'i' },
      }));
    if (query.status && query.status !== 'all')
      filter.blocked = query.status === 'blocked';
    // Include existing orders without migrating or rewriting their customer snapshots.
    const pipeline: PipelineStage[] = [
      {
        $project: {
          googleId: 1,
          profileName: '$name',
          profileEmail: '$email',
          profilePhone: '$phone',
          blocked: 1,
          blockReason: 1,
        },
      },
      {
        $unionWith: {
          coll: this.orders.collection.name,
          pipeline: [
            { $match: { customerGoogleId: { $type: 'string', $ne: '' } } },
            {
              $project: {
                googleId: '$customerGoogleId',
                orderName: '$cliente',
                orderEmail: '$customerEmail',
                orderPhone: '$telefono',
                orderCreatedAt: '$createdAt',
                orderCount: { $literal: 1 },
                approvedCount: { $cond: ['$validadoPorAdmin', 1, 0] },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$googleId',
          profileName: { $max: '$profileName' },
          profileEmail: { $max: '$profileEmail' },
          profilePhone: { $max: '$profilePhone' },
          blocked: { $max: '$blocked' },
          blockReason: { $max: '$blockReason' },
          totalOrders: { $sum: '$orderCount' },
          approvedOrders: { $sum: '$approvedCount' },
          lastOrderAt: { $max: '$orderCreatedAt' },
          latest: {
            $top: {
              sortBy: { orderCreatedAt: -1 },
              output: {
                name: '$orderName',
                email: '$orderEmail',
                phone: '$orderPhone',
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          googleId: '$_id',
          name: { $ifNull: ['$profileName', '$latest.name'] },
          email: { $ifNull: ['$profileEmail', '$latest.email', ''] },
          phone: { $ifNull: ['$profilePhone', '$latest.phone', ''] },
          blocked: { $ifNull: ['$blocked', false] },
          blockReason: { $ifNull: ['$blockReason', ''] },
          totalOrders: 1,
          approvedOrders: 1,
          lastOrderAt: 1,
        },
      },
      { $match: filter },
      { $sort: { lastOrderAt: -1, name: 1, googleId: 1 } },
      {
        $facet: {
          items: [{ $skip: (query.page - 1) * 25 }, { $limit: 25 }],
          count: [{ $count: 'total' }],
        },
      },
    ];
    const [result] = await this.customers
      .aggregate<{ items: CustomerRow[]; count: { total: number }[] }>(pipeline)
      .exec();
    return {
      items: result.items,
      total: result.count[0]?.total ?? 0,
      page: query.page,
      pageSize: 25,
    };
  }
  async setBlocked(googleId: string, input: CustomerBlockDto, admin: string) {
    let customer = await this.customers.findOne({ googleId }).exec();
    if (!customer) {
      const order = await this.orders
        .findOne({ customerGoogleId: googleId })
        .sort({ createdAt: -1 })
        .exec();
      if (!order) throw new NotFoundException('No existe ese cliente.');
      // Only identities already verified by the old Google flow are eligible here.
      await this.customers
        .updateOne(
          { googleId },
          {
            $setOnInsert: {
              googleId,
              name: order.cliente,
              email: order.customerEmail || '',
              phone: order.telefono,
              blocked: false,
              authVersion: 0,
            },
          },
          { upsert: true },
        )
        .exec();
    }
    customer = await this.customers
      .findOneAndUpdate(
        { googleId, blocked: { $ne: input.blocked } },
        {
          $set: {
            blocked: input.blocked,
            blockReason: input.blocked ? input.reason || '' : '',
            blockedBy: admin,
            blockedAt: new Date(),
          },
          $inc: { authVersion: 1 },
        },
        { new: true },
      )
      .exec();
    return customer ?? this.customers.findOne({ googleId }).exec();
  }
}
