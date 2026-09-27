import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PetGender } from '@prisma/client';

export class QueryPetDto {
  @ApiPropertyOptional({
    description: 'Số trang hiện tại (bắt đầu từ 1)',
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page tối thiểu là 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên một trang',
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (theo tên thú cưng, loài, giống hoặc tên/SĐT chủ sở hữu)',
    example: 'Miu',
  })
  @IsString({ message: 'Search phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loài (Ví dụ: Chó, Mèo)',
    example: 'Mèo',
  })
  @IsString({ message: 'Species phải là chuỗi ký tự' })
  @IsOptional()
  species?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo giới tính thú cưng',
    enum: PetGender,
  })
  @IsEnum(PetGender, { message: 'Gender không hợp lệ' })
  @IsOptional()
  gender?: PetGender;

  @ApiPropertyOptional({
    description: 'Lọc theo ID của chủ sở hữu',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'UserId phải là số nguyên' })
  @IsOptional()
  userId?: number;
}
