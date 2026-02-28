import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildPayload(exception, status, request.url);
    response.status(status).json(payload);
  }

  private buildPayload(
    exception: unknown,
    statusCode: number,
    path: string,
  ): ErrorResponse {
    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return {
          statusCode,
          path,
          timestamp: new Date().toISOString(),
          message: responseBody,
        };
      }

      if (
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'message' in responseBody
      ) {
        const message = (responseBody as { message: string | string[] })
          .message;
        return {
          statusCode,
          path,
          timestamp: new Date().toISOString(),
          message,
        };
      }
    }

    return {
      statusCode,
      path,
      timestamp: new Date().toISOString(),
      message: 'Internal server error',
    };
  }
}
