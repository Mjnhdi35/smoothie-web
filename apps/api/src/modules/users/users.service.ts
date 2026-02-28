import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  normalizeDateInput,
  normalizeLowerCase,
  normalizeOptionalLowerCase,
  normalizeOptionalTrimmed,
  normalizePagination,
  normalizeTrimmed,
} from '../../common/query/query-normalizer';
import {
  USER_LIST_DEFAULTS,
  USER_LIST_PAGINATION,
  USERS_REPOSITORY,
} from './users.constants';
import type { UsersRepositoryPort } from './users.repository.port';
import type {
  UserId,
  UserListPage,
  UserListQuery,
  UserRow,
} from './users.types';

function userNotFoundMessage(id: UserId): string {
  return `User ${id} not found`;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepositoryPort,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserRow> {
    const normalizedEmail = normalizeLowerCase(createUserDto.email);
    const normalizedName = normalizeTrimmed(createUserDto.name);
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

  async findAll(query: ListUsersQueryDto): Promise<UserListPage> {
    return this.usersRepository.findAll(this.normalizeListQuery(query));
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
      email: normalizeOptionalLowerCase(updateUserDto.email),
      name: normalizeOptionalTrimmed(updateUserDto.name),
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
    const deletedCount = await this.usersRepository.softDeleteById(id);

    if (deletedCount === 0) {
      throw new NotFoundException(userNotFoundMessage(id));
    }
  }

  async restore(id: UserId): Promise<UserRow> {
    const restoredUser = await this.usersRepository.restoreById(id);

    if (restoredUser === undefined) {
      throw new NotFoundException(userNotFoundMessage(id));
    }

    return restoredUser;
  }

  private normalizeListQuery(query: ListUsersQueryDto): UserListQuery {
    const limit = normalizePagination(query, USER_LIST_PAGINATION);

    return {
      limit,
      cursor: query.cursor,
      sortBy: USER_LIST_DEFAULTS.sortBy,
      sortOrder: USER_LIST_DEFAULTS.sortOrder,
      deleted: USER_LIST_DEFAULTS.deleted,
      email: normalizeOptionalLowerCase(query.email),
      name: normalizeOptionalTrimmed(query.name),
      createdFrom: normalizeDateInput(query.createdFrom),
      createdTo: normalizeDateInput(query.createdTo),
    };
  }
}
