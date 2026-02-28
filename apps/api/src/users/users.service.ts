import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import type { UserRow } from './users.repository';
import type { UserId } from './users.repository';

function userNotFoundMessage(id: UserId): string {
  return `User ${id} not found`;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserRow> {
    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const normalizedName = this.normalizeName(createUserDto.name);
    const existingUser =
      await this.usersRepository.findByEmail(normalizedEmail);

    if (existingUser !== undefined) {
      throw new ConflictException('User email already exists');
    }

    return this.usersRepository.create({
      email: normalizedEmail,
      name: normalizedName,
    });
  }

  async findAll(limit: number, offset: number): Promise<UserRow[]> {
    return this.usersRepository.findAll({ limit, offset });
  }

  async findOne(id: UserId): Promise<UserRow> {
    const user = await this.usersRepository.findById(id);

    if (user === undefined) {
      throw new NotFoundException(userNotFoundMessage(id));
    }

    return user;
  }

  async update(id: UserId, updateUserDto: UpdateUserDto): Promise<UserRow> {
    const updatePayload: UpdateUserDto = {
      ...updateUserDto,
      email:
        updateUserDto.email === undefined
          ? undefined
          : this.normalizeEmail(updateUserDto.email),
      name:
        updateUserDto.name === undefined
          ? undefined
          : this.normalizeName(updateUserDto.name),
    };

    if (updatePayload.email !== undefined) {
      const existingByEmail = await this.usersRepository.findByEmail(
        updatePayload.email,
      );

      if (existingByEmail !== undefined && existingByEmail.id !== id) {
        throw new ConflictException('User email already exists');
      }
    }

    const updatedUser = await this.usersRepository.updateById(
      id,
      updatePayload,
    );

    if (updatedUser === undefined) {
      throw new NotFoundException(userNotFoundMessage(id));
    }

    return updatedUser;
  }

  async remove(id: UserId): Promise<void> {
    const deletedCount = await this.usersRepository.deleteById(id);

    if (deletedCount === 0) {
      throw new NotFoundException(userNotFoundMessage(id));
    }
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeName(value: string): string {
    return value.trim();
  }
}
