import { GoogleAuthService } from './google-auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

describe('Google customer authentication', () => {
  const jwt = new JwtService({ secret: 'test-only-secret' });
  const service = new GoogleAuthService(
    new ConfigService({ GOOGLE_CLIENT_ID: 'test-client' }),
    jwt,
  );
  afterEach(() => jest.restoreAllMocks());
  it('verifies the audience and creates only a customer session', async () => {
    const verify = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({
        getPayload: () => ({
          sub: 'google-user',
          email: 'customer@example.test',
          email_verified: true,
          name: 'Cliente',
        }),
      } as never);
    const result = await service.login('test-google-credential');
    expect(verify).toHaveBeenCalledWith({
      idToken: 'test-google-credential',
      audience: 'test-client',
    });
    expect(jwt.verify(result.access_token)).toMatchObject({
      sub: 'google-user',
      role: 'customer',
    });
    expect(
      jwt.verify(result.access_token).exp - jwt.verify(result.access_token).iat,
    ).toBe(3600);
  });
  it('rejects invalid Google credentials', async () => {
    jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockRejectedValue(new Error('invalid'));
    await expect(service.login('invalid')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('rejects an unverified email', async () => {
    jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({
        getPayload: () => ({
          sub: 'user',
          email: 'x@example.test',
          email_verified: false,
        }),
      } as never);
    await expect(service.login('credential')).rejects.toMatchObject({
      status: 401,
    });
  });
});
