import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { UserRow } from './users.repository';

type UsersRepositoryMock = {
  create: jest.Mock;
  findById: jest.Mock;
  findByEmail: jest.Mock;
  findAll: jest.Mock;
  updateById: jest.Mock;
  deleteById: jest.Mock;
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
      deleteById: jest.fn(),
    };

    usersService = new UsersService(
      usersRepository as unknown as UsersRepository,
    );
  });

  it('create should throw ConflictException when email already exists', async () => {
    const existingUser: UserRow = {
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      email: 'john@example.com',
      name: 'John',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };

    usersRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      usersService.create({ email: 'john@example.com', name: 'John' }),
    ).rejects.toThrow(ConflictException);
  });

  it('findOne should throw NotFoundException when user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(undefined);

    await expect(
      usersService.findOne('99999999-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove should throw NotFoundException when delete count is zero', async () => {
    usersRepository.deleteById.mockResolvedValue(0);

    await expect(
      usersService.remove('99999999-aaaa-4bbb-8ccc-0123456789ab'),
    ).rejects.toThrow(NotFoundException);
  });
});
