import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
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
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { QueryPetDto } from './dto/query-pet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { petAvatarUploadOptions } from '../common/utils/multer-options.util';

@ApiTags('Pets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  /**
   * GET /api/pets/my-pets
   * Xem danh sách thú cưng của chính mình (Khách hàng & Người dùng hiện tại)
   */
  @Get('my-pets')
  @ApiOperation({
    summary: 'Lấy danh sách thú cưng của người dùng hiện tại (My Pets)',
    description: 'Chỉ cần đăng nhập bằng Bearer JWT, trả về danh sách thú cưng của chính mình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thú cưng của người dùng hiện tại.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  getMyPets(@Request() req: any) {
    return this.petsService.getMyPets(req.user.id);
  }

  /**
   * GET /api/pets
   * Lấy danh sách toàn bộ thú cưng trong hệ thống (Chỉ ADMIN & STAFF)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả thú cưng trong hệ thống (Admin & Staff Only)',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo tên pet/loài/giống hoặc thông tin chủ sở hữu, và bộ lọc theo species, gender, userId, isActive.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thú cưng kèm thông tin phân trang.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN hoặc STAFF).',
  })
  findAll(@Query() query: QueryPetDto) {
    return this.petsService.findAll(query);
  }

  /**
   * POST /api/pets
   * Tạo thú cưng mới kèm upload avatar
   */
  @Post()
  @UseInterceptors(FileInterceptor('avatar', petAvatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo thú cưng mới & Upload ảnh đại diện',
    description:
      'OWNER tạo thì tự động gán userId = req.user.id. ADMIN & STAFF có thể truyền userId trong Body để tạo hộ khách hàng (userId phải có role OWNER).',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thú cưng thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu không hợp lệ hoặc userId được tạo hộ không có vai trò OWNER.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  create(
    @Request() req: any,
    @Body() createPetDto: CreatePetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.create(req.user.id, req.user.role, createPetDto, file);
  }

  /**
   * GET /api/pets/:id
   * Xem chi tiết một thú cưng theo ID
   */
  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID thú cưng', example: 1 })
  @ApiOperation({
    summary: 'Xem chi tiết thú cưng theo ID',
    description:
      'OWNER chỉ xem được thú cưng của mình. ADMIN và STAFF có quyền xem mọi thú cưng trong hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết của thú cưng.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem thú cưng của người khác.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thú cưng.',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.petsService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * PATCH /api/pets/:id
   * Cập nhật thông tin thú cưng & Upload avatar mới
   */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar', petAvatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID thú cưng', example: 1 })
  @ApiOperation({
    summary: 'Cập nhật thông tin thú cưng theo ID & Upload avatar mới',
    description:
      'OWNER chỉ cập nhật được thú cưng của mình. ADMIN và STAFF có quyền cập nhật thú cưng của bất kỳ ai.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thú cưng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền cập nhật thú cưng của người khác.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thú cưng.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() updatePetDto: UpdatePetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.update(
      id,
      req.user.id,
      req.user.role,
      updatePetDto,
      file,
    );
  }

  /**
   * DELETE /api/pets/:id
   * Xóa mềm thú cưng theo ID
   */
  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID thú cưng', example: 1 })
  @ApiOperation({
    summary: 'Xóa mềm thú cưng theo ID',
    description:
      'Chuyển isDelete = true và isActive = false. OWNER chỉ xóa được thú cưng của mình. ADMIN và STAFF có quyền xóa thú cưng của bất kỳ ai.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thú cưng thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xóa thú cưng của người khác.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thú cưng.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.petsService.remove(id, req.user.id, req.user.role);
  }
}
