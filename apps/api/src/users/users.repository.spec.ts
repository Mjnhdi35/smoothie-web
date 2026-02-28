import type { DbKnex } from '../database/database.constants';
import { UsersRepository } from './users.repository';
import type { UserRow } from './users.repository';

type MockQueryBuilder = {
  insert: jest.Mock;
  returning: jest.Mock;
  select: jest.Mock;
  where: jest.Mock;
  whereRaw: jest.Mock;
  whereNull: jest.Mock;
  whereNotNull: jest.Mock;
  andWhere: jest.Mock;
  orWhereRaw: jest.Mock;
  first: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  update: jest.Mock;
  del: jest.Mock;
};

const createQueryBuilder = (): MockQueryBuilder => {
  const queryBuilder = {} as MockQueryBuilder;

  queryBuilder.insert = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.returning = jest.fn();
  queryBuilder.select = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.where = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereRaw = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereNull = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.whereNotNull = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.andWhere = jest.fn().mockImplementation((callback) => {
    callback(queryBuilder);
    return queryBuilder;
  });
  queryBuilder.orWhereRaw = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.first = jest.fn();
  queryBuilder.orderBy = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.limit = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.offset = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.update = jest.fn().mockReturnValue(queryBuilder);
  queryBuilder.del = jest.fn();

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
    expect(queryBuilder.whereRaw).toHaveBeenCalledWith(
      'lower(email) = lower(?)',
      ['missing@example.com'],
    );
    expect(queryBuilder.whereNull).toHaveBeenCalledWith('deleted_at');
  });

  it('findAll should apply filter rules', async () => {
    queryBuilder.offset.mockResolvedValue([]);

    await usersRepository.findAll({
      limit: 20,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      deleted: 'exclude',
      search: 'john',
      email: 'john@example.com',
      name: 'john',
    });

    expect(queryBuilder.whereNull).toHaveBeenCalledWith('deleted_at');
    expect(queryBuilder.whereRaw).toHaveBeenCalledWith(
      'lower(email) = lower(?)',
      ['john@example.com'],
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('created_at', 'desc');
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
    expect(queryBuilder.whereNull).toHaveBeenCalledWith('deleted_at');
    expect(queryBuilder.del).not.toHaveBeenCalled();
  });
});
