import { NextFunction, Request, Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';

export interface Route {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>;
}

export interface ControllerInterface {
  router: Router;
}

export abstract class Controller implements ControllerInterface {
  public readonly router = Router();

  protected addRoute({ method, path, handler }: Route): void {
    this.router[method](path, asyncHandler(handler.bind(this)));
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
