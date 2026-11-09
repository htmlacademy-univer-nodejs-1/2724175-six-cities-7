import { inject, injectable } from 'inversify';
import { ReturnModelType } from '@typegoose/typegoose';
import { Component } from '../../di/component.js';
import { Logger } from '../../libs/logger/logger.interface.js';
import { OfferService, OfferInput } from './offer-service.interface.js';
import { OfferDocument, OfferEntity } from './offer.model.js';

@injectable()
export class DefaultOfferService implements OfferService {
  constructor(
    @inject(Component.OfferModel) private readonly offerModel: ReturnModelType<typeof OfferEntity>,
    @inject(Component.Logger) private readonly logger: Logger
  ) {}

  public async create(offer: OfferInput): Promise<OfferDocument> {
    const document = await this.offerModel.create(offer) as unknown as OfferDocument;
    this.logger.info('Offer created');
    return document;
  }

  public async findById(id: string): Promise<OfferDocument | null> {
    const model: { findOne: (conditions: unknown) => { exec(): Promise<unknown> } } =
      this.offerModel as unknown as { findOne: (conditions: unknown) => { exec(): Promise<unknown> } };
    const document = await model.findOne({ _id: id }).exec();
    return (document ?? null) as OfferDocument | null;
  }
}
