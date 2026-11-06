import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';
@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string> {
  transform(value: string) {
    if (!isMongoId(value)) throw new BadRequestException('ID de menú inválido');
    return value;
  }
}
