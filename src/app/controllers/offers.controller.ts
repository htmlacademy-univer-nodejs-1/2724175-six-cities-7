import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { Controller } from '../../shared/libs/rest/controller.js';
import { HttpError } from '../../shared/libs/rest/exception-filter.js';
import { CreateOfferDto } from '../../shared/modules/offer/dto/create-offer.dto.js';
import { UpdateOfferDto } from '../../shared/modules/offer/dto/update-offer.dto.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { CITY_LOCATIONS, CityName } from '../../shared/types/index.js';
import { offerPreview, offerResponse } from './responses.js';

export type CurrentUser = (request: Request) => Promise<{ id: string; favorites: Types.ObjectId[] } | null>;
export type CreateOfferBody = Omit<CreateOfferDto, 'city' | 'author' | 'postDate'> & { city: CityName };
export type UpdateOfferBody = Omit<UpdateOfferDto, 'city'> & { city?: CityName };

type OfferParams = Record<string, string>;

export function offerIdFrom(value: string): string {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Некорректный идентификатор предложения.');
  }
  return value.toLowerCase();
}

function cityFrom(name: string): CityName {
  if (!Object.hasOwnProperty.call(CITY_LOCATIONS, name)) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Неизвестный город.');
  }
  return name as CityName;
}

export async function requireUser(request: Request, currentUser: CurrentUser) {
  const user = await currentUser(request);
  if (!user) {
    throw new HttpError(StatusCodes.UNAUTHORIZED, 'Клиент не авторизован.');
  }
  return user;
}

export class OffersController extends Controller {
  constructor(private readonly offers: OfferService, private readonly currentUser: CurrentUser) {
    super();
    this.addRoute({ method: 'get', path: '/', handler: this.list });
    this.addRoute({ method: 'post', path: '/', handler: this.create });
    this.addRoute({ method: 'get', path: '/cities/:city/premium', handler: this.premium });
    this.addRoute({ method: 'get', path: '/:offerId', handler: this.show });
    this.addRoute({ method: 'patch', path: '/:offerId', handler: this.update });
    this.addRoute({ method: 'delete', path: '/:offerId', handler: this.remove });
  }

  private async list(request: Request, response: Response): Promise<void> {
    const raw = request.query.limit;
    const limit = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (raw !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Лимит должен быть положительным целым числом.');
    }
    const user = await this.currentUser(request);
    const favorites = new Set(user?.favorites.map(String));
    const offers = await this.offers.find(raw === undefined ? undefined : limit);
    this.ok(response, offers.map((offer) => offerPreview(offer, favorites.has(offer.id))));
  }

  private async premium(request: Request, response: Response): Promise<void> {
    const city = cityFrom(request.params.city);
    const user = await this.currentUser(request);
    const favorites = new Set(user?.favorites.map(String));
    this.ok(response, (await this.offers.findPremiumByCity(city))
      .map((offer) => offerPreview(offer, favorites.has(offer.id))));
  }

  private async show(request: Request, response: Response): Promise<void> {
    const id = offerIdFrom(request.params.offerId);
    const user = await this.currentUser(request);
    this.ok(response, offerResponse(await this.findOffer(id), user?.favorites.some((favorite) => String(favorite) === id) ?? false));
  }

  private async create(request: Request<OfferParams, unknown, CreateOfferBody>, response: Response): Promise<void> {
    const user = await requireUser(request, this.currentUser);
    const { city, ...body } = request.body;
    const name = cityFrom(city);
    const offer = await this.offers.create({ ...body, city: { name, location: CITY_LOCATIONS[name] }, author: new Types.ObjectId(user.id), postDate: new Date() });
    this.created(response, offerResponse(await this.findOffer(offer.id), false));
  }

  private async update(request: Request<OfferParams, unknown, UpdateOfferBody>, response: Response): Promise<void> {
    const id = offerIdFrom(request.params.offerId);
    const user = await requireUser(request, this.currentUser);
    await this.requireOwner(id, user.id);
    const { city, ...dto } = request.body;
    const name = city === undefined ? undefined : cityFrom(city);
    const offer = await this.offers.updateById(id, { ...dto, city: name === undefined ? undefined : { name, location: CITY_LOCATIONS[name] } });
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    this.ok(response, offerResponse(offer, user.favorites.some((favorite) => String(favorite) === id)));
  }

  private async remove(request: Request, response: Response): Promise<void> {
    const id = offerIdFrom(request.params.offerId);
    const user = await requireUser(request, this.currentUser);
    await this.requireOwner(id, user.id);
    if (!await this.offers.deleteById(id)) {
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

  private async requireOwner(id: string, userId: string): Promise<void> {
    if (!await this.offers.exists(id)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Предложение не найдено.');
    }
    if (!await this.offers.isAuthor(id, userId)) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'Недостаточно прав для изменения предложения.');
    }
  }
}
