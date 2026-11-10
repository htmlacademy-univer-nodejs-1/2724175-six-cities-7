import { CityName } from '../../types/index.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { OfferDocument } from './offer.model.js';

export interface OfferService {
  create(offer: CreateOfferDto): Promise<OfferDocument>;
  findById(id: string): Promise<OfferDocument | null>;
  find(count?: number): Promise<OfferDocument[]>;
  findPremiumByCity(city: CityName): Promise<OfferDocument[]>;
  findFavorites(userId: string): Promise<OfferDocument[]>;
  updateById(id: string, dto: UpdateOfferDto): Promise<OfferDocument | null>;
  deleteById(id: string): Promise<OfferDocument | null>;
  exists(id: string): Promise<boolean>;
  isAuthor(id: string, userId: string): Promise<boolean>;
}
