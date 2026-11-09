import { Offer } from '../../types/index.js';
import { Types } from 'mongoose';
import { OfferDocument } from './offer.model.js';

export type OfferInput = Omit<Offer, 'author'> & { author: Types.ObjectId };

export interface OfferService {
  create(offer: OfferInput): Promise<OfferDocument>;
  findById(id: string): Promise<OfferDocument | null>;
}
