import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { CreateUserDto } from '../../shared/modules/user/dto/create-user.dto.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { CurrentUser } from './offers.controller.js';
import { userResponse } from './responses.js';

type RegisterBody = Omit<CreateUserDto, 'avatar'> & { avatarPath?: string };
type LoginBody = Pick<CreateUserDto, 'email' | 'password'>;

export class UsersController extends Controller {
  constructor(private readonly users: UserService, private readonly salt: string,
    private readonly currentUser: CurrentUser) {
    super();
    this.addRoute({ method: 'post', path: '/register', handler: this.register });
    this.addRoute({ method: 'post', path: '/login', handler: this.login });
    this.addRoute({ method: 'get', path: '/login/me', handler: this.me });
    this.addRoute({ method: 'post', path: '/:userId/avatar', handler: this.uploadAvatar });
  }

  private async register(request: Request<Record<string, string>, unknown, RegisterBody>, response: Response): Promise<void> {
    if (await this.currentUser(request)) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'Регистрация недоступна авторизованному клиенту.');
    }
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

  private async login(_request: Request<Record<string, string>, unknown, LoginBody>): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Вход пока недоступен.');
  }

  private async me(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Проверка авторизации пока недоступна.');
  }

  private async uploadAvatar(): Promise<void> {
    throw new HttpError(StatusCodes.NOT_IMPLEMENTED, 'Загрузка аватара пока недоступна.');
  }
}
