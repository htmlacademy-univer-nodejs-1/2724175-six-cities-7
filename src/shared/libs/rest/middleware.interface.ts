import { NextFunction, Request, Response } from 'express';

export interface Middleware {
  execute(request: Request, response: Response, next: NextFunction): void | Promise<void>;
}
