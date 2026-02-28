import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { UsersController } from './users.controller';
import { CreateUserDto } from './dto/create-user.dto';
import type { UsersService } from './users.service';

type UsersServiceMock = {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

describe('UsersController', () => {
  let usersController: UsersController;
  let usersServiceMock: UsersServiceMock;
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    usersServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    usersController = new UsersController(
      usersServiceMock as unknown as UsersService,
    );
    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
  });

  it('should reject invalid create payload with BadRequestException', async () => {
    await expect(
      validationPipe.transform(
        { email: 'invalid-email', name: '' },
        { type: 'body', metatype: CreateUserDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should delegate create to service for valid payload', async () => {
    usersServiceMock.create.mockResolvedValue({ id: 1 });

    await usersController.create({
      email: 'john@example.com',
      name: 'John',
    });

    expect(usersServiceMock.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      name: 'John',
    });
  });

  it('should mark remove endpoint with HTTP 204', () => {
    const httpCode = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      UsersController.prototype['remove'] as unknown as object,
    ) as number | undefined;

    expect(httpCode).toBe(204);
  });
});
