import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type { UserId, UserListPage, UserRow } from './users.types';

const UUID_V4_PIPE = new ParseUUIDPipe({ version: '4' });

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserRow> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: ListUsersQueryDto): Promise<UserListPage> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UUID_V4_PIPE) id: UserId): Promise<UserRow> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UUID_V4_PIPE) id: UserId,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserRow> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/restore')
  restore(@Param('id', UUID_V4_PIPE) id: UserId): Promise<UserRow> {
    return this.usersService.restore(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', UUID_V4_PIPE) id: UserId): Promise<void> {
    await this.usersService.remove(id);
  }
}
