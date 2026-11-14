import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
export class CustomerQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['all', 'active', 'blocked']) status?:
    'all' | 'active' | 'blocked';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
}
export class CustomerBlockDto {
  @IsBoolean() blocked: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason?: string;
}
