import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from './exception-filter.js';
import { Middleware } from './middleware.interface.js';

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
