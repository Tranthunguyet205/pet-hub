import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role, Prisma } from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper format avatarUrl cho user object
   */
  private formatUserAvatar<T extends { avatarUrl?: string | null }>(user: T): T {
    if (!user) return user;
    return {
      ...user,
      avatarUrl: toPublicImageUrl(user.avatarUrl),
    };
  }

  /**
   * Tạo người dùng mới (Dành cho ADMIN)
   */
  async create(createUserDto: CreateUserDto, file?: Express.Multer.File) {
    const { email, password, fullName, phoneNumber, role, specialty } = createUserDto;

    const normalizedEmail = email.toLowerCase().trim();

    const existingEmail = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        isDelete: false,
      },
    });

    if (existingEmail) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    if (phoneNumber) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phoneNumber: phoneNumber.trim(),
          isDelete: false,
        },
      });

      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng');
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const avatarUrl = file ? `/files/avatars/${file.filename}` : null;

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        role: role || Role.OWNER,
        avatarUrl,
        isDelete: false,
        ...(specialty && { specialty: specialty.trim() }),
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return this.formatUserAvatar(safeUser);
  }

  /**
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc (Dành cho ADMIN)
   */
  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      isDelete: false,
    };

    if (role) {
      where.role = role;
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { fullName: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
        { phoneNumber: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          avatarUrl: true,
          specialty: true,
          role: true,
          isDelete: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => this.formatUserAvatar(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xem chi tiết thông tin cá nhân của chính mình (GET /api/users/me)
   */
  async getMe(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const { passwordHash: _, ...safeUser } = user;
    return this.formatUserAvatar(safeUser);
  }

  /**
   * Cập nhật thông tin cá nhân của chính mình (PATCH /api/users/me)
   */
  async updateMe(
    userId: number,
    updateProfileDto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    if (updateProfileDto.phoneNumber && updateProfileDto.phoneNumber !== user.phoneNumber) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phoneNumber: updateProfileDto.phoneNumber.trim(),
          isDelete: false,
          NOT: { id: userId },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng bởi tài khoản khác');
      }
    }

    const avatarUrl = file ? `/files/avatars/${file.filename}` : undefined;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateProfileDto.fullName && { fullName: updateProfileDto.fullName.trim() }),
        ...(updateProfileDto.phoneNumber && { phoneNumber: updateProfileDto.phoneNumber.trim() }),
        ...(updateProfileDto.specialty && { specialty: updateProfileDto.specialty.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return this.formatUserAvatar(safeUser);
  }

  /**
   * Xem chi tiết bất kỳ người dùng nào theo ID (Dành cho ADMIN)
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    const { passwordHash: _, ...safeUser } = user;
    return this.formatUserAvatar(safeUser);
  }

  /**
   * Cập nhật thông tin người dùng theo ID (Dành cho ADMIN)
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    if (updateUserDto.phoneNumber && updateUserDto.phoneNumber !== user.phoneNumber) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phoneNumber: updateUserDto.phoneNumber.trim(),
          isDelete: false,
          NOT: { id },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng bởi tài khoản khác');
      }
    }

    const avatarUrl = file ? `/files/avatars/${file.filename}` : undefined;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.fullName && { fullName: updateUserDto.fullName.trim() }),
        ...(updateUserDto.phoneNumber && { phoneNumber: updateUserDto.phoneNumber.trim() }),
        ...(updateUserDto.specialty && { specialty: updateUserDto.specialty.trim() }),
        ...(updateUserDto.role && { role: updateUserDto.role }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return this.formatUserAvatar(safeUser);
  }

  /**
   * Xóa mềm người dùng theo ID (Dành cho ADMIN)
   */
  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('Bạn không thể tự xóa tài khoản quản trị của chính mình');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isDelete: true,
      },
    });

    return {
      message: `Đã xóa mềm thành công người dùng ID: ${id}`,
    };
  }

  /**
   * Người dùng tự đổi mật khẩu (PATCH /api/users/me/change-password)
   */
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDelete: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu cũ');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }
}
