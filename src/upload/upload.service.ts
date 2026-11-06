import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; public_id: string }> {
    if (!file?.buffer?.length)
      throw new BadRequestException('Selecciona una imagen.');
    const buffer = file.buffer;
    const png = buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    const webp =
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    if ((!png && !jpeg && !webp) || buffer.length > 10 * 1024 * 1024)
      throw new BadRequestException(
        'Usa una imagen PNG, JPG o WebP de hasta 10 MB.',
      );
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'delivery-lunch/biblioteca', resource_type: 'image' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error('Error subiendo imagen a Cloudinary', error);
            return reject(
              new InternalServerErrorException(
                'Error al subir imagen a Cloudinary',
              ),
            );
          }
          resolve({ url: result.secure_url, public_id: result.public_id });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
