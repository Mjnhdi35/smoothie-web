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
} from '../common/query/query-normalizer';
import type { UserDeletedScope } from './users.repository';
import type { UserListQuery } from './users.repository';
import type { UserRow } from './users.repository';
import type { UserId } from './users.repository';
import { USERS_REPOSITORY } from './users.repository';
import type { UsersRepositoryPort } from './users.repository';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const MIN_OFFSET = 0;
const DEFAULT_SORT_BY: UserListQuery['sortBy'] = 'created_at';
const DEFAULT_SORT_ORDER: UserListQuery['sortOrder'] = 'desc';
const DEFAULT_DELETED_SCOPE: UserDeletedScope = 'exclude';
const USER_LIST_PAGINATION = {
  defaultLimit: DEFAULT_LIMIT,
  minLimit: MIN_LIMIT,
  maxLimit: MAX_LIMIT,
  minOffset: MIN_OFFSET,
} as const;

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

  async findAll(query: ListUsersQueryDto): Promise<UserRow[]> {
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
    const pagination = normalizePagination(query, USER_LIST_PAGINATION);

    return {
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: query.sortBy ?? DEFAULT_SORT_BY,
      sortOrder: query.sortOrder ?? DEFAULT_SORT_ORDER,
      deleted: query.deleted ?? DEFAULT_DELETED_SCOPE,
      email: normalizeOptionalLowerCase(query.email),
      name: normalizeOptionalTrimmed(query.name),
      search: normalizeOptionalTrimmed(query.search),
      createdFrom: normalizeDateInput(query.createdFrom),
      createdTo: normalizeDateInput(query.createdTo),
    };
  }
}
