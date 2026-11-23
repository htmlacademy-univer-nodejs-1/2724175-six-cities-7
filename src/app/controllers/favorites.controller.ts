import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { CurrentUser, offerIdFrom, requireUser } from './offers.controller.js';
import { offerPreview, offerResponse } from './responses.js';

export class FavoritesController extends Controller {
  constructor(private readonly offers: OfferService, private readonly users: UserService, private readonly currentUser: CurrentUser) {
    super();
    this.addRoute({ method: 'get', path: '/', handler: this.list });
    this.addRoute({ method: 'post', path: '/:offerId', handler: this.add });
    this.addRoute({ method: 'delete', path: '/:offerId', handler: this.remove });
  }

  private async list(request: Request, response: Response): Promise<void> {
    const user = await requireUser(request, this.currentUser);
    this.ok(response, (await this.offers.findFavorites(user.id)).map((offer) => offerPreview(offer, true)));
  }

  private async add(request: Request, response: Response): Promise<void> {
    await this.change(request, response, true);
  }

  private async remove(request: Request, response: Response): Promise<void> {
    await this.change(request, response, false);
  }

  private async change(request: Request, response: Response, favorite: boolean): Promise<void> {
    const id = offerIdFrom(request.params.offerId);
    const user = await requireUser(request, this.currentUser);
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    if (favorite) {
      await this.users.addToFavorites(user.id, id);
    } else {
      await this.users.removeFromFavorites(user.id, id);
    }
    this.ok(response, offerResponse(offer, favorite));
  }
}
