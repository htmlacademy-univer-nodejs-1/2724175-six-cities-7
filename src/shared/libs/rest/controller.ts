import { NextFunction, Request, Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import { Middleware } from './middleware.interface.js';

export interface Route {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>;
  middleware?: readonly Middleware[];
}

export interface ControllerInterface {
  router: Router;
}

export abstract class Controller implements ControllerInterface {
  public readonly router = Router();

  protected addRoute({ method, path, handler, middleware = [] }: Route): void {
    const handlers = middleware.map((item) => asyncHandler(item.execute.bind(item)));
    this.router[method](path, ...handlers, asyncHandler(handler.bind(this)));
  }

  protected ok(response: Response, data: unknown): void {
    response.status(StatusCodes.OK).json(data);
  }

  protected created(response: Response, data: unknown): void {
    response.status(StatusCodes.CREATED).json(data);
  }

  protected noContent(response: Response): void {
    response.status(StatusCodes.NO_CONTENT).end();
  }
}
