import {
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
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'delivery-lunch', resource_type: 'image' },
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
