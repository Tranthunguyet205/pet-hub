import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PetGender } from '@prisma/client';
import { IsOwnerUser } from '../../common/validators/is-owner-user.validator';

export class CreatePetDto {
  @ApiProperty({
    description: 'Tên của thú cưng',
    example: 'Miu Miu',
  })
  @IsString({ message: 'Tên thú cưng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên thú cưng không được để trống' })
  name: string;

  @ApiProperty({
    description: 'Loài thú cưng (Ví dụ: Chó, Mèo, Chuột hamster...)',
    example: 'Mèo',
  })
  @IsString({ message: 'Loài thú cưng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Loài thú cưng không được để trống' })
  species: string;

  @ApiPropertyOptional({
    description: 'Giống thú cưng (Ví dụ: Golden Retriever, Poodle, Mèo Anh lông ngắn...)',
    example: 'Mèo Anh lông ngắn',
  })
  @IsOptional()
  @IsString({ message: 'Giống thú cưng phải là chuỗi ký tự' })
  breed?: string;

  @ApiPropertyOptional({
    description: 'Giới tính thú cưng',
    enum: PetGender,
    default: PetGender.UNKNOWN,
    example: PetGender.MALE,
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

  @ApiProperty({
    description: 'Cân nặng của thú cưng (kg)',
    example: 4.5,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Cân nặng phải là số hợp lệ' })
  @Min(0.01, { message: 'Cân nặng phải lớn hơn 0' })
  weight: number;

  @ApiPropertyOptional({
    description: 'Ghi chú dị ứng thức ăn hoặc thuốc',
    example: 'Dị ứng thức ăn có hải sản',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú dị ứng phải là chuỗi ký tự' })
  allergyNotes?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú đặc biệt hoặc thói quen chăm sóc',
    example: 'Sợ sấy lông ở tai',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú đặc biệt phải là chuỗi ký tự' })
  specialNotes?: string;

  @ApiPropertyOptional({
    description:
      'ID chủ sở hữu (Chỉ ADMIN hoặc STAFF mới được phép truyền để tạo thú cưng hộ khách hàng role OWNER)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID người dùng phải là số nguyên' })
  @IsOwnerUser({
    message:
      'Người dùng (userId) không tồn tại hoặc không phải là khách hàng có vai trò OWNER',
  })
  userId?: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Ảnh đại diện thú cưng (JPG, JPEG, PNG, WEBP tối đa 5MB)',
  })
  avatar?: any;
}
