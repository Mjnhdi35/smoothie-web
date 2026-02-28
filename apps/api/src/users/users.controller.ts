import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type { UserRow } from './users.repository';
import type { UserId } from './users.repository';

const UUID_V4_PIPE = new ParseUUIDPipe({ version: '4' });

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserRow> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<UserRow[]> {
    return this.usersService.findAll(limit, offset);
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

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', UUID_V4_PIPE) id: UserId): Promise<void> {
    await this.usersService.remove(id);
  }
}
