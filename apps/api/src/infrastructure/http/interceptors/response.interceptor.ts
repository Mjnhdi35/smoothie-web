import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

interface SuccessResponse<TData> {
  data: TData;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<TData> implements NestInterceptor<
  TData,
  SuccessResponse<TData>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<SuccessResponse<TData>> {
    const request = context.switchToHttp().getRequest<{ url: string }>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => {
        if (response.statusCode === 204 || data === undefined) {
          return undefined as unknown as SuccessResponse<TData>;
        }

        return {
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
