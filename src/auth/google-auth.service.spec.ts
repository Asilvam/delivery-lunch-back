import { GoogleAuthService } from './google-auth.service';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

describe('Google customer authentication', () => {
  const service = new GoogleAuthService(
    new ConfigService({ GOOGLE_CLIENT_ID: 'test-client' }),
  );
  afterEach(() => jest.restoreAllMocks());
  it('verifies the audience and returns only a verified customer identity', async () => {
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
    const result = await service.verify('test-google-credential');
    expect(verify).toHaveBeenCalledWith({
      idToken: 'test-google-credential',
      audience: 'test-client',
    });
    expect(result).toEqual({
      googleId: 'google-user',
      name: 'Cliente',
      email: 'customer@example.test',
    });
  });
  it('rejects invalid Google credentials', async () => {
    jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockRejectedValue(new Error('invalid'));
    await expect(service.verify('invalid')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('rejects an unverified email', async () => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'user',
        email: 'x@example.test',
        email_verified: false,
      }),
    } as never);
    await expect(service.verify('credential')).rejects.toMatchObject({
      status: 401,
    });
  });
});
