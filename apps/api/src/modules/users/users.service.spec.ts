import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { USER_LIST_DEFAULTS, USER_LIST_PAGINATION } from './users.constants';
import type { UsersRepositoryPort } from './users.repository.port';
import type { UserRow } from './users.types';

type UsersRepositoryMock = {
  create: jest.Mock;
  findById: jest.Mock;
  findByEmail: jest.Mock;
  findAll: jest.Mock;
  updateById: jest.Mock;
  softDeleteById: jest.Mock;
  restoreById: jest.Mock;
};

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: UsersRepositoryMock;

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      updateById: jest.fn(),
      softDeleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    usersService = new UsersService(
      usersRepository as unknown as UsersRepositoryPort,
    );
  });

  it('create should throw ConflictException when email already exists', async () => {
    const existingUser: UserRow = {
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      email: 'john@example.com',
      name: 'John',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
    };

    usersRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      usersService.create({ email: 'john@example.com', name: 'John' }),
    ).rejects.toThrow(ConflictException);
  });

  it('create should normalize email and name before persisting', async () => {
    usersRepository.findByEmail.mockResolvedValue(undefined);
    usersRepository.create.mockResolvedValue({
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      email: 'john@example.com',
      name: 'John',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
    } satisfies UserRow);

    await usersService.create({
      email: '  JOHN@EXAMPLE.COM ',
      name: '  John  ',
    });

    expect(usersRepository.findByEmail).toHaveBeenCalledWith(
      'john@example.com',
    );
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      name: 'John',
    });
  });

  it('findOne should throw NotFoundException when user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(undefined);

    await expect(
      usersService.findOne('99999999-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove should throw NotFoundException when delete count is zero', async () => {
    usersRepository.softDeleteById.mockResolvedValue(0);

    await expect(
      usersService.remove('99999999-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });

  it('restore should throw NotFoundException when user does not exist', async () => {
    usersRepository.restoreById.mockResolvedValue(undefined);

    await expect(
      usersService.restore('99999999-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });

  it('findAll should normalize and clamp filter query', async () => {
    usersRepository.findAll.mockResolvedValue({ items: [] });

    await usersService.findAll({
      limit: 999,
      email: 'john@example.com',
      cursor:
        'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAyVDAwOjAwOjAwLjAwMFoiLCJpZCI6ImYwZjFmMmYzLWFhYWEtNGJiYi04Y2NjLTAxMjM0NTY3ODlhYiJ9',
    });

    expect(usersRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: USER_LIST_PAGINATION.maxLimit,
        cursor:
          'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAyVDAwOjAwOjAwLjAwMFoiLCJpZCI6ImYwZjFmMmYzLWFhYWEtNGJiYi04Y2NjLTAxMjM0NTY3ODlhYiJ9',
        deleted: USER_LIST_DEFAULTS.deleted,
      }),
    );
  });
});
