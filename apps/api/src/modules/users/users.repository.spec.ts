import { decodeCursor } from '../../common/query/cursor-pagination';
import type { DbKnex } from '../../infrastructure/database/database.constants';
import {
  USER_COLUMNS,
  USER_LIST_DEFAULTS,
  USER_LIST_PAGINATION,
} from './users.constants';
import { UsersRepository } from './users.repository';
import type { UserRow } from './users.types';

type MockQueryBuilder = {
  insert: jest.Mock;
  returning: jest.Mock;
  select: jest.Mock;
  where: jest.Mock;
  whereILike: jest.Mock;
  whereNull: jest.Mock;
  whereNotNull: jest.Mock;
  andWhere: jest.Mock;
  orWhere: jest.Mock;
  first: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  update: jest.Mock;
};

const createQueryBuilder = (): MockQueryBuilder => {
  const queryBuilder = {} as MockQueryBuilder;

  queryBuilder.insert = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.returning = jest.fn();
  queryBuilder.select = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.where = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereILike = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereNull = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereNotNull = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.andWhere = jest.fn().mockImplementation((...args: unknown[]) => {
    const [firstArg] = args;

    if (typeof firstArg === 'function') {
      firstArg(queryBuilder);
    }

    return queryBuilder;
  });
  queryBuilder.orWhere = jest.fn().mockImplementation((...args: unknown[]) => {
    const [firstArg] = args;

    if (typeof firstArg === 'function') {
      firstArg(queryBuilder);
    }

    return queryBuilder;
  });
  queryBuilder.first = jest.fn();
  queryBuilder.orderBy = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.limit = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.update = jest.fn().mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe('UsersRepository', () => {
  let usersRepository: UsersRepository;
  let queryBuilder: MockQueryBuilder;
  let knexMock: jest.Mock;

  beforeEach(() => {
    queryBuilder = createQueryBuilder();

    const knexClient = Object.assign(
      jest.fn(() => queryBuilder),
      {
        fn: {
          now: jest.fn(() => 'NOW'),
        },
      },
    );

    knexMock = knexClient;
    usersRepository = new UsersRepository(knexClient as unknown as DbKnex);
  });

  it('create should build insert query and return created user', async () => {
    const createdUser: UserRow = {
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      email: 'john@example.com',
      name: 'John',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
    };

    queryBuilder.returning.mockResolvedValue([createdUser]);

    const result = await usersRepository.create({
      email: 'john@example.com',
      name: 'John',
    });

    expect(result).toEqual(createdUser);
    expect(knexMock).toHaveBeenCalledWith('users');
    expect(queryBuilder.insert).toHaveBeenCalledWith({
      email: 'john@example.com',
      name: 'John',
      created_at: 'NOW',
      updated_at: 'NOW',
    });
  });

  it('findByEmail should apply active scope by default', async () => {
    queryBuilder.first.mockResolvedValue(undefined);

    const result = await usersRepository.findByEmail('missing@example.com');

    expect(result).toBeUndefined();
    expect(queryBuilder.whereILike).toHaveBeenCalledWith(
      USER_COLUMNS.email,
      'missing@example.com',
    );
    expect(queryBuilder.whereNull).toHaveBeenCalledWith(USER_COLUMNS.deletedAt);
  });

  it('findAll should return nextCursor when there are more records', async () => {
    const first: UserRow = {
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ab',
      email: 'a@example.com',
      name: 'A',
      created_at: new Date('2026-01-02T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
      deleted_at: null,
    };
    const second: UserRow = {
      id: 'f0f1f2f3-aaaa-4bbb-8ccc-0123456789ac',
      email: 'b@example.com',
      name: 'B',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
    };

    queryBuilder.limit.mockResolvedValue([first, second]);

    const result = await usersRepository.findAll({
      limit: 1,
      sortBy: USER_LIST_DEFAULTS.sortBy,
      sortOrder: USER_LIST_DEFAULTS.sortOrder,
      deleted: USER_LIST_DEFAULTS.deleted,
      email: 'john@example.com',
      name: 'john',
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(queryBuilder.whereNull).toHaveBeenCalledWith(USER_COLUMNS.deletedAt);
    expect(queryBuilder.whereILike).toHaveBeenCalledWith(
      USER_COLUMNS.email,
      'john@example.com',
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      USER_LIST_DEFAULTS.sortBy,
      USER_LIST_DEFAULTS.sortOrder,
    );
  });

  it('findAll should apply cursor condition', async () => {
    queryBuilder.limit.mockResolvedValue([]);

    const page = await usersRepository.findAll({
      limit: USER_LIST_PAGINATION.defaultLimit,
      cursor:
        'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAyVDAwOjAwOjAwLjAwMFoiLCJpZCI6ImYwZjFmMmYzLWFhYWEtNGJiYi04Y2NjLTAxMjM0NTY3ODlhYiJ9',
      sortBy: USER_LIST_DEFAULTS.sortBy,
      sortOrder: USER_LIST_DEFAULTS.sortOrder,
      deleted: USER_LIST_DEFAULTS.deleted,
    });

    expect(page.items).toEqual([]);
    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(() =>
      decodeCursor(
        'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAyVDAwOjAwOjAwLjAwMFoiLCJpZCI6ImYwZjFmMmYzLWFhYWEtNGJiYi04Y2NjLTAxMjM0NTY3ODlhYiJ9',
      ),
    ).not.toThrow();
  });

  it('softDeleteById should update deleted_at and not hard delete', async () => {
    queryBuilder.update.mockResolvedValue(1);

    const deletedCount = await usersRepository.softDeleteById(
      '7d7e7f70-aaaa-4bbb-8ccc-1234567890ab',
    );

    expect(deletedCount).toBe(1);
    expect(queryBuilder.where).toHaveBeenCalledWith({
      id: '7d7e7f70-aaaa-4bbb-8ccc-1234567890ab',
    });
    expect(queryBuilder.whereNull).toHaveBeenCalledWith(USER_COLUMNS.deletedAt);
  });
});
