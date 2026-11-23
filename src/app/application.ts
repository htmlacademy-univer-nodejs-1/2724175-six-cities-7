import express from 'express';
import { Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { Component } from '../shared/di/component.js';
import { Config } from '../shared/libs/config/config.interface.js';
import { DatabaseClient } from '../shared/libs/database-client/database-client.interface.js';
import { Logger } from '../shared/libs/logger/logger.interface.js';
import { OfferService } from '../shared/modules/offer/offer-service.interface.js';
import { UserService } from '../shared/modules/user/user-service.interface.js';
import { ExceptionFilter, HttpError } from '../shared/libs/rest/exception-filter.js';
import { CurrentUser, OffersController } from './controllers/offers.controller.js';
import { FavoritesController } from './controllers/favorites.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { ImagesController } from './controllers/images.controller.js';

@injectable()
export class Application {
  private readonly app = express();

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) private readonly config: Config,
    @inject(Component.DatabaseClient) private readonly database: DatabaseClient,
    @inject(Component.OfferService) private readonly offers: OfferService,
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.CurrentUser) private readonly currentUser: CurrentUser
  ) {}

  public async init(): Promise<Server> {
    this.registerMiddleware();
    this.registerRoutes();
    this.app.use(new ExceptionFilter(this.logger).catch);
    const host = this.config.get('DB_HOST');
    const address = host.includes(':') ? `[${host}]` : host;
    const user = encodeURIComponent(this.config.get('DB_USER'));
    const password = encodeURIComponent(this.config.get('DB_PASSWORD'));
    const db = encodeURIComponent(this.config.get('DB_NAME'));
    await this.database.connect(`mongodb://${user}:${password}@${address}:${this.config.get('DB_PORT')}/${db}?authSource=admin`);
    const port = this.config.get('PORT');
    try {
      const server = await new Promise<Server>((resolve, reject) => {
        const listener = this.app.listen(port, () => {
          listener.off('error', reject);
          resolve(listener);
        });
        listener.once('error', reject);
      });
      server.once('close', () => {
        void this.database.disconnect().catch((error: Error) => this.logger.error('Ошибка закрытия соединения.', error));
      });
      this.logger.info('Приложение инициализировано.', { port });
      return server;
    } catch (error) {
      await this.database.disconnect();
      throw error;
    }
  }

  private registerMiddleware(): void {
    this.app.disable('x-powered-by');
    this.app.use(express.json());
    this.app.get('/static/default-avatar.jpg', (_request, response, next) => {
      response.sendFile(fileURLToPath(new URL('../../markup/img/avatar-max.jpg', import.meta.url)), (error) => {
        if (error) {
          return next(error);
        }
      });
    });
  }

  private registerRoutes(): void {
    this.app.use('/offers', new OffersController(this.offers, this.currentUser).router);
    this.app.use('/favorites', new FavoritesController(this.offers, this.users, this.currentUser).router);
    this.app.use('/users', new UsersController(this.users, this.config.get('SALT'), this.currentUser).router);
    this.app.use('/images', new ImagesController().router);
    this.app.use((_request, _response, next) => {
      next(new HttpError(StatusCodes.NOT_FOUND, 'Маршрут не найден.'));
    });
  }
}
