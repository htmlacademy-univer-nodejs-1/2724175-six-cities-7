import { IsMongoId } from 'class-validator';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { ValidateDtoMiddleware } from '../../shared/libs/rest/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../../shared/libs/rest/validate-object-id.middleware.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { offerPreview, offerResponse } from './responses.js';

class FavoritesQuery {
  @IsMongoId()
  public userId!: string;
}

export class FavoritesController extends Controller {
  constructor(private readonly offers: OfferService, private readonly users: UserService) {
    super();
    const query = new ValidateDtoMiddleware(FavoritesQuery, 'query');
    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ method: 'get', path: '/', handler: this.index, middleware: [query] });
    this.addRoute({ method: 'post', path: '/:offerId', handler: this.create, middleware: [offerId, query] });
    this.addRoute({ method: 'delete', path: '/:offerId', handler: this.delete, middleware: [offerId, query] });
  }

  private async index(request: Request, response: Response): Promise<void> {
    const { userId } = request.query as unknown as FavoritesQuery;
    if (!await this.users.findById(userId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Пользователь не найден.');
    }
    this.ok(response, (await this.offers.findFavorites(userId)).map((offer) => offerPreview(offer, true)));
  }

  private async create(request: Request, response: Response): Promise<void> {
    await this.change(request, response, true);
  }

  private async delete(request: Request, response: Response): Promise<void> {
    await this.change(request, response, false);
  }

  private async change(request: Request, response: Response, favorite: boolean): Promise<void> {
    const { offerId } = request.params;
    const { userId } = request.query as unknown as FavoritesQuery;
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    const user = favorite
      ? await this.users.addToFavorites(userId, offerId)
      : await this.users.removeFromFavorites(userId, offerId);
    if (!user) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Пользователь не найден.');
    }
    this.ok(response, offerResponse(offer, favorite));
  }
}
