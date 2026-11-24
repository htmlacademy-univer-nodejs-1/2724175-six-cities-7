import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { ValidateDtoMiddleware } from '../../shared/libs/rest/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../../shared/libs/rest/validate-object-id.middleware.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { userResponse } from './responses.js';
import { LoginBody, RegisterBody } from './user-request.dto.js';

export class UsersController extends Controller {
  constructor(private readonly users: UserService, private readonly salt: string) {
    super();
    this.addRoute({ method: 'post', path: '/register', handler: this.create, middleware: [new ValidateDtoMiddleware(RegisterBody)] });
    this.addRoute({ method: 'post', path: '/login', handler: this.login, middleware: [new ValidateDtoMiddleware(LoginBody)] });
    this.addRoute({ method: 'get', path: '/login/me', handler: this.me });
    this.addRoute({ method: 'post', path: '/:userId/avatar', handler: this.uploadAvatar, middleware: [new ValidateObjectIdMiddleware('userId')] });
  }

  private async create(request: Request<Record<string, string>, unknown, RegisterBody>, response: Response): Promise<void> {
    const { avatarPath, ...dto } = request.body;
    try {
      this.created(response, userResponse(await this.users.create({ ...dto, avatar: avatarPath }, this.salt)));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new HttpError(StatusCodes.CONFLICT, 'Пользователь с таким email уже существует.');
      }
      throw error;
    }
  }

  private async login(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Вход пока недоступен.');
  }

  private async me(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Проверка авторизации пока недоступна.');
  }

  private async uploadAvatar(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Загрузка аватара пока недоступна.');
  }
}
