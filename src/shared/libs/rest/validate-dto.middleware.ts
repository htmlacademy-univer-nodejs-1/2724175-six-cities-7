import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from './exception-filter.js';
import { Middleware } from './middleware.interface.js';

function hasReservedKeys(input: object): boolean {
  const pending = [input];
  while (pending.length > 0) {
    const value = pending.pop() as object;
    for (const [key, child] of Object.entries(value)) {
      if (Object.prototype.hasOwnProperty.call(Object.prototype, key)) {
        return true;
      }
      if (child !== null && typeof child === 'object') {
        pending.push(child);
      }
    }
  }
  return false;
}

export class ValidateDtoMiddleware implements Middleware {
  constructor(
    private readonly dto: ClassConstructor<object>,
    private readonly source: 'body' | 'query' | 'params' = 'body',
    private readonly partial = false
  ) {}

  public async execute(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const input: unknown = request[this.source];
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
      (this.partial && Object.keys(input).length === 0)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Ожидается объект с данными запроса.');
    }
    if (hasReservedKeys(input)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Данные запроса не прошли проверку.');
    }
    const dto = plainToInstance(this.dto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipUndefinedProperties: this.partial,
      validationError: { target: false, value: false }
    });
    if (errors.length > 0 || (this.partial && Object.values(dto).every((value) => value === undefined))) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Данные запроса не прошли проверку.');
    }
    request[this.source] = dto;
    next();
  }
}
