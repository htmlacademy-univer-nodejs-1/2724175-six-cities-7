import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { ValidateDtoMiddleware } from '../../shared/libs/rest/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../../shared/libs/rest/validate-object-id.middleware.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { CITY_LOCATIONS } from '../../shared/types/index.js';
import { CreateOfferBody, OfferListQuery, PremiumParams, UpdateOfferBody } from './offer-request.dto.js';
import { offerPreview, offerResponse } from './responses.js';

export class OffersController extends Controller {
  constructor(private readonly offers: OfferService, private readonly users: UserService) {
    super();
    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ method: 'get', path: '/', handler: this.index, middleware: [new ValidateDtoMiddleware(OfferListQuery, 'query')] });
    this.addRoute({ method: 'post', path: '/', handler: this.create, middleware: [new ValidateDtoMiddleware(CreateOfferBody)] });
    this.addRoute({ method: 'get', path: '/cities/:city/premium', handler: this.premium, middleware: [new ValidateDtoMiddleware(PremiumParams, 'params')] });
    this.addRoute({ method: 'get', path: '/:offerId', handler: this.show, middleware: [offerId] });
    this.addRoute({ method: 'patch', path: '/:offerId', handler: this.update, middleware: [offerId, new ValidateDtoMiddleware(UpdateOfferBody, 'body', true)] });
    this.addRoute({ method: 'delete', path: '/:offerId', handler: this.delete, middleware: [offerId] });
  }

  private async index(request: Request, response: Response): Promise<void> {
    const { limit } = request.query as unknown as OfferListQuery;
    this.ok(response, (await this.offers.find(limit)).map((offer) => offerPreview(offer, false)));
  }

  private async premium(request: Request, response: Response): Promise<void> {
    const { city } = request.params as unknown as PremiumParams;
    this.ok(response, (await this.offers.findPremiumByCity(city)).map((offer) => offerPreview(offer, false)));
  }

  private async show(request: Request, response: Response): Promise<void> {
    this.ok(response, offerResponse(await this.findOffer(request.params.offerId), false));
  }

  private async create(request: Request<Record<string, string>, unknown, CreateOfferBody>, response: Response): Promise<void> {
    const { city, authorId, ...body } = request.body;
    if (!await this.users.findById(authorId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Автор не найден.');
    }
    const offer = await this.offers.create({ ...body, city: { name: city, location: CITY_LOCATIONS[city] }, author: new Types.ObjectId(authorId) });
    this.created(response, offerResponse(await this.findOffer(offer.id), false));
  }

  private async update(request: Request<Record<string, string>, unknown, Partial<UpdateOfferBody>>, response: Response): Promise<void> {
    const { city, ...dto } = request.body;
    const offer = await this.offers.updateById(request.params.offerId, {
      ...dto, city: city === undefined ? undefined : { name: city, location: CITY_LOCATIONS[city] }
    });
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    this.ok(response, offerResponse(offer, false));
  }

  private async delete(request: Request, response: Response): Promise<void> {
    if (!await this.offers.deleteById(request.params.offerId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    this.noContent(response);
  }

  private async findOffer(id: string) {
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    return offer;
  }
}
