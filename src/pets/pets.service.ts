import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { QueryPetDto } from './dto/query-pet.dto';
import { Role, Prisma, PetGender } from '@prisma/client';
import { formatPetAvatar } from '../common/utils/image-url.util';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo thú cưng mới
   * - OWNER: Tự động gán userId = req.user.id
   * - ADMIN / STAFF: Cho phép truyền userId trong body để tạo hộ khách hàng (Bắt buộc userId phải là role OWNER)
   */
  async create(
    currentUserId: number,
    currentUserRole: Role,
    createPetDto: CreatePetDto,
    file?: Express.Multer.File,
  ) {
    const targetUserId =
      currentUserRole === Role.OWNER
        ? currentUserId
        : createPetDto.userId || currentUserId;

    const avatarUrl = file ? `/files/petAvatars/${file.filename}` : null;

    const pet = await this.prisma.pet.create({
      data: {
        userId: targetUserId,
        name: createPetDto.name.trim(),
        species: createPetDto.species.trim(),
        breed: createPetDto.breed ? createPetDto.breed.trim() : null,
        gender: createPetDto.gender || PetGender.UNKNOWN,
        birthDate: createPetDto.birthDate
          ? new Date(createPetDto.birthDate)
          : null,
        weight: createPetDto.weight,
        avatarUrl,
        allergyNotes: createPetDto.allergyNotes
          ? createPetDto.allergyNotes.trim()
          : null,
        specialNotes: createPetDto.specialNotes
          ? createPetDto.specialNotes.trim()
          : null,
        isDelete: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });

    return formatPetAvatar(pet);
  }

  /**
   * Lấy danh sách thú cưng của người dùng hiện tại (GET /api/pets/my-pets)
   */
  async getMyPets(currentUserId: number) {
    const pets = await this.prisma.pet.findMany({
      where: {
        userId: currentUserId,
        isDelete: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return pets.map((pet) => formatPetAvatar(pet));
  }

  /**
   * Lấy danh sách toàn bộ thú cưng có phân trang & lọc (Dành cho ADMIN & STAFF)
   */
  async findAll(query: QueryPetDto) {
    const { page = 1, limit = 10, search, species, gender, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PetWhereInput = {
      isDelete: false,
    };

    if (species && species.trim()) {
      where.species = { contains: species.trim(), mode: 'insensitive' };
    }

    if (gender) {
      where.gender = gender;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { species: { contains: keyword, mode: 'insensitive' } },
        { breed: { contains: keyword, mode: 'insensitive' } },
        {
          user: {
            fullName: { contains: keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            phoneNumber: { contains: keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: keyword, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.pet.count({ where }),
    ]);

    return {
      data: data.map((pet) => formatPetAvatar(pet)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xem chi tiết một thú cưng theo ID
   * - OWNER: Chỉ xem được thú cưng của mình
   * - ADMIN / STAFF: Xem được thú cưng của bất kỳ ai
   */
  async findOne(id: number, currentUserId: number, currentUserRole: Role) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        isDelete: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException(`Không tìm thấy thú cưng với ID: ${id}`);
    }

    if (currentUserRole === Role.OWNER && pet.userId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập thông tin thú cưng này',
      );
    }

    return formatPetAvatar(pet);
  }

  /**
   * Cập nhật thông tin thú cưng theo ID
   * - OWNER: Chỉ cập nhật thú cưng của mình
   * - ADMIN / STAFF: Cập nhật được thú cưng của bất kỳ ai
   */
  async update(
    id: number,
    currentUserId: number,
    currentUserRole: Role,
    updatePetDto: UpdatePetDto,
    file?: Express.Multer.File,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!pet) {
      throw new NotFoundException(`Không tìm thấy thú cưng với ID: ${id}`);
    }

    if (currentUserRole === Role.OWNER && pet.userId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật thú cưng này',
      );
    }

    const avatarUrl = file ? `/files/petAvatars/${file.filename}` : undefined;

    const updatedPet = await this.prisma.pet.update({
      where: { id },
      data: {
        ...(updatePetDto.name && { name: updatePetDto.name.trim() }),
        ...(updatePetDto.species && { species: updatePetDto.species.trim() }),
        ...(updatePetDto.breed !== undefined && {
          breed: updatePetDto.breed ? updatePetDto.breed.trim() : null,
        }),
        ...(updatePetDto.gender && { gender: updatePetDto.gender }),
        ...(updatePetDto.birthDate !== undefined && {
          birthDate: updatePetDto.birthDate
            ? new Date(updatePetDto.birthDate)
            : null,
        }),
        ...(updatePetDto.weight !== undefined && { weight: updatePetDto.weight }),
        ...(updatePetDto.allergyNotes !== undefined && {
          allergyNotes: updatePetDto.allergyNotes
            ? updatePetDto.allergyNotes.trim()
            : null,
        }),
        ...(updatePetDto.specialNotes !== undefined && {
          specialNotes: updatePetDto.specialNotes
            ? updatePetDto.specialNotes.trim()
            : null,
        }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });

    return formatPetAvatar(updatedPet);
  }

  /**
   * Xóa mềm thú cưng theo ID (isDelete = true)
   * - OWNER: Chỉ xóa được thú cưng của mình
   * - ADMIN / STAFF: Xóa được thú cưng của bất kỳ ai
   */
  async remove(id: number, currentUserId: number, currentUserRole: Role) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!pet) {
      throw new NotFoundException(`Không tìm thấy thú cưng với ID: ${id}`);
    }

    if (currentUserRole === Role.OWNER && pet.userId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thú cưng này',
      );
    }

    await this.prisma.pet.update({
      where: { id },
      data: {
        isDelete: true,
      },
    });

    return {
      message: `Đã xóa mềm thành công thú cưng ID: ${id}`,
    };
  }
}
