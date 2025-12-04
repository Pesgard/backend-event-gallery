import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    error: string;
    message: string;
    statusCode: number;
    details?: Record<string, string[]>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        error = res.error || exception.name;

        // Handle validation errors from class-validator
        if (Array.isArray(res.message)) {
          details = {};
          res.message.forEach((msg: string) => {
            const [field] = msg.split(' ');
            if (!details![field]) {
              details![field] = [];
            }
            details![field].push(msg);
          });
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        error,
        message,
        statusCode: status,
        ...(details && { details }),
      },
    };

    response.status(status).json(errorResponse);
  }
}

