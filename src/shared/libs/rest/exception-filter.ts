import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../logger/logger.interface.js';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  public readonly catch: ErrorRequestHandler = (error: unknown, _request, response, next): void => {
    let status: number = StatusCodes.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера.';
    if (error instanceof HttpError) {
      ({ status, message } = error);
    } else if (error instanceof Error && 'type' in error) {
      if (error.type === 'entity.parse.failed') {
        status = StatusCodes.BAD_REQUEST;
        message = 'Некорректный JSON.';
      } else if (error.type === 'entity.too.large') {
        status = StatusCodes.REQUEST_TOO_LONG;
        message = 'Тело запроса слишком большое.';
      }
    }
    if (status >= 500) {
      this.logger.error('Ошибка сервера.', error instanceof Error ? error : new Error('Неизвестная ошибка.'));
    } else {
      this.logger.warn('Ошибка HTTP-запроса.', { status, message });
    }
    if (response.headersSent) {
      next(error);
      return;
    }
    response.status(status).json({ error: message });
  };
}
