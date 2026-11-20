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
    description: 'Tạo phòng lưu trú mới với tên, mô tả, đơn giá theo đêm, trạng thái phòng và hình ảnh.',
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
  /**
   * GET /api/boarding-rooms/price-range
   * Khoảng giá phòng theo đêm, cho form đặt lịch của chủ nuôi.
   *
   * Phải khai báo TRƯỚC @Get(':id'), nếu không 'price-range' sẽ bị
   * ParseIntPipe của route đó bắt và trả 400.
   */
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @Get('price-range')
  @ApiOperation({
    summary: 'Khoảng giá phòng lưu trú theo đêm',
    description:
      'Trả về min/max giá theo đêm của các phòng có thể xếp (bỏ qua phòng bảo trì). ' +
      'Dùng cho form đặt lịch của chủ nuôi để ước lượng tiền phòng khi chưa biết sẽ được xếp phòng nào. ' +
      'Không trả danh sách phòng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Khoảng giá phòng.',
    schema: {
      example: { min: 150000, max: 600000, roomCount: 9, unit: 'NIGHT' },
    },
  })
  getPriceRange() {
    return this.boardingRoomsService.getPriceRange();
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách phòng lưu trú (Admin & Staff)',
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
  @Roles(Role.ADMIN, Role.STAFF)
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
    description: 'Cập nhật name, description, pricePerNight, status hoặc hình ảnh của phòng lưu trú.',
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
