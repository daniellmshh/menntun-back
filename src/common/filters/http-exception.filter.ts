import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorResponse } from '../types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.getMessage(exceptionResponse, exception);

    response.status(status).json({
      ...errorResponse(message),
      meta: { statusCode: status, path: request.url },
    });
  }

  private getMessage(
    exceptionResponse: string | object | null,
    exception: unknown,
  ) {
    if (typeof exceptionResponse === 'string') return exceptionResponse;

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const { message } = exceptionResponse as { message?: unknown };
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }

    return exception instanceof Error
      ? exception.message
      : 'Internal server error';
  }
}
