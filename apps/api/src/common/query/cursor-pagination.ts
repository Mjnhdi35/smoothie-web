import { BadRequestException } from '@nestjs/common';
import type { Knex } from 'knex';

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface CursorPage<TItem> {
  items: TItem[];
  nextCursor?: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;

    if (
      typeof parsed.createdAt !== 'string' ||
      parsed.createdAt.trim() === '' ||
      typeof parsed.id !== 'string' ||
      parsed.id.trim() === ''
    ) {
      throw new BadRequestException('Invalid cursor');
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export function applyCursorPagination(
  queryBuilder: Knex.QueryBuilder,
  cursor: CursorPayload | undefined,
  createdAtColumn: string,
  idColumn: string,
): void {
  if (cursor === undefined) {
    return;
  }

  queryBuilder.andWhere((builder) => {
    builder
      .where(createdAtColumn, '<', new Date(cursor.createdAt))
      .orWhere((nestedBuilder) => {
        nestedBuilder
          .where(createdAtColumn, '=', new Date(cursor.createdAt))
          .andWhere(idColumn, '<', cursor.id);
      });
  });
}
