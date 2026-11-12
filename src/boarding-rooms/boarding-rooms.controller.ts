import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { BoardingRoomsService } from './boarding-rooms.service';
import { CreateBoardingRoomDto } from './dto/create-boarding-room.dto';
import { UpdateBoardingRoomDto } from './dto/update-boarding-room.dto';
import { QueryBoardingRoomDto } from './dto/query-boarding-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { boardingRoomImageUploadOptions } from '../common/utils/multer-options.util';

@ApiTags('Boarding Rooms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('boarding-rooms')
export class BoardingRoomsController {
  constructor(private readonly boardingRoomsService: BoardingRoomsService) {}

  /**
   * POST /api/boarding-rooms
   * Tạo phòng/chuồng lưu trú mới (Chỉ ADMIN)
   */
  @Post()
  @UseInterceptors(FileInterceptor('image', boardingRoomImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo phòng lưu trú mới (Admin Only)',
    description: 'Tạo phòng lưu trú mới với tên, mô tả, đơn giá theo giờ, trạng thái phòng và hình ảnh.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo phòng lưu trú thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 409,
    description: 'Tên phòng lưu trú đã tồn tại.',
  })
  create(
    @Body() createDto: CreateBoardingRoomDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.boardingRoomsService.create(createDto, file);
  }

  /**
   * GET /api/boarding-rooms
   * Lấy danh sách phòng lưu trú (Chỉ ADMIN)
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách phòng lưu trú (Admin Only)',
    description: 'Hỗ trợ phân trang, tìm kiếm theo tên/mô tả và lọc theo trạng thái phòng (RoomStatus).',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách phòng lưu trú kèm thông tin phân trang.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  findAll(@Query() query: QueryBoardingRoomDto) {
    return this.boardingRoomsService.findAll(query);
  }

  /**
   * GET /api/boarding-rooms/:id
   * Lấy thông tin chi tiết phòng lưu trú (Chỉ ADMIN)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết phòng lưu trú theo ID (Admin Only)',
    description: 'Trả về thông tin chi tiết của phòng lưu trú.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của phòng lưu trú',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết phòng lưu trú.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng lưu trú.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boardingRoomsService.findOne(id);
  }

  /**
   * PATCH /api/boarding-rooms/:id
   * Cập nhật thông tin phòng lưu trú (Chỉ ADMIN)
   */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', boardingRoomImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật phòng lưu trú (Admin Only)',
    description: 'Cập nhật name, description, pricePerHour, status hoặc hình ảnh của phòng lưu trú.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của phòng lưu trú cần cập nhật',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật phòng lưu trú thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng lưu trú.',
  })
  @ApiResponse({
    status: 409,
    description: 'Tên phòng lưu trú mới bị trùng với phòng khác.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBoardingRoomDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.boardingRoomsService.update(id, updateDto, file);
  }

  /**
   * DELETE /api/boarding-rooms/:id
   * Xóa mềm phòng lưu trú (Chỉ ADMIN)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa mềm phòng lưu trú (Admin Only)',
    description: 'Chuyển trạng thái isDelete thành true. Chặn xóa nếu phòng đang được gán cho booking đang hoạt động.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của phòng lưu trú cần xóa',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa mềm phòng lưu trú thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Phòng đang được gán cho booking hoạt động nên không thể xóa.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng lưu trú.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.boardingRoomsService.remove(id);
  }
}
