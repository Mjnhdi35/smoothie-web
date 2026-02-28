import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  statusCode: number;
  requestId?: string;
  path: string;
  timestamp: string;
  error: {
    message: string | string[];
  };
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

    const payload = this.buildPayload(
      exception,
      status,
      request.url,
      request.header('x-request-id'),
    );
    response.status(status).json(payload);
  }

  private buildPayload(
    exception: unknown,
    statusCode: number,
    path: string,
    requestId?: string,
  ): ErrorResponse {
    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return {
          success: false,
          statusCode,
          requestId,
          path,
          timestamp: new Date().toISOString(),
          error: {
            message: responseBody,
          },
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
          success: false,
          statusCode,
          requestId,
          path,
          timestamp: new Date().toISOString(),
          error: {
            message,
          },
        };
      }
    }

    return {
      success: false,
      statusCode,
      requestId,
      path,
      timestamp: new Date().toISOString(),
      error: {
        message: 'Internal server error',
      },
    };
  }
}
