import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@ValidatorConstraint({ name: 'IsOwnerUser', async: true })
@Injectable()
export class IsOwnerUserConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    const userId = Number(value);
    if (isNaN(userId) || userId <= 0) {
      return false;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDelete: false,
      },
    });

    if (!user) {
      return false;
    }

    return user.role === Role.OWNER;
  }

  defaultMessage(args: ValidationArguments): string {
    return `Người dùng (userId = ${args.value}) không tồn tại hoặc không phải là khách hàng có vai trò OWNER`;
  }
}

export function IsOwnerUser(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsOwnerUserConstraint,
    });
  };
}
