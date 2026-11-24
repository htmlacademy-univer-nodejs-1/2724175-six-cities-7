import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from './exception-filter.js';
import { Middleware } from './middleware.interface.js';

export class ValidateObjectIdMiddleware implements Middleware {
  constructor(private readonly parameter: string) {}

  public execute(request: Request, _response: Response, next: NextFunction): void {
    const value = request.params[this.parameter];
    if (typeof value !== 'string' || !/^[0-9a-f]{24}$/i.test(value)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, `Некорректный идентификатор «${this.parameter}».`);
    }
    request.params[this.parameter] = value.toLowerCase();
    next();
  }
}
