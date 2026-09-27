import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PetGender } from '@prisma/client';

export class UpdatePetDto {
  @ApiPropertyOptional({
    description: 'Tên của thú cưng',
    example: 'Miu Miu Updated',
  })
  @IsOptional()
  @IsString({ message: 'Tên thú cưng phải là chuỗi ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Loài thú cưng (Ví dụ: Chó, Mèo...)',
    example: 'Mèo',
  })
  @IsOptional()
  @IsString({ message: 'Loài thú cưng phải là chuỗi ký tự' })
  species?: string;

  @ApiPropertyOptional({
    description: 'Giống thú cưng (Ví dụ: Mèo Anh lông ngắn...)',
    example: 'Mèo Anh lông dài',
  })
  @IsOptional()
  @IsString({ message: 'Giống thú cưng phải là chuỗi ký tự' })
  breed?: string;

  @ApiPropertyOptional({
    description: 'Giới tính thú cưng',
    enum: PetGender,
    example: PetGender.FEMALE,
  })
  @IsOptional()
  @IsEnum(PetGender, {
    message: 'Giới tính thú cưng phải thuộc: MALE, FEMALE, UNKNOWN',
  })
  gender?: PetGender;

  @ApiPropertyOptional({
    description: 'Ngày sinh thú cưng (Định dạng ISO-8601 YYYY-MM-DD)',
    example: '2023-05-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ngày sinh phải có định dạng ngày hợp lệ (YYYY-MM-DD)' },
  )
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Cân nặng của thú cưng (kg)',
    example: 4.8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Cân nặng phải là số hợp lệ' })
  @Min(0.01, { message: 'Cân nặng phải lớn hơn 0' })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú dị ứng thức ăn hoặc thuốc',
    example: 'Dị ứng thức ăn có hải sản',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú dị ứng phải là chuỗi ký tự' })
  allergyNotes?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú đặc biệt hoặc thói quen chăm sóc',
    example: 'Sợ nước và tiếng sấy lớn',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú đặc biệt phải là chuỗi ký tự' })
  specialNotes?: string;


  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt của thú cưng',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isActive phải là kiểu boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Ảnh đại diện mới của thú cưng (JPG, JPEG, PNG, WEBP tối đa 5MB)',
  })
  avatar?: any;
}
