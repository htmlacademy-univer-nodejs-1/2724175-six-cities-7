import { CityName, Offer } from './index.js';

export type OfferTemplate = Pick<Offer, 'title' | 'description' | 'previewImage' | 'images' | 'author'> & {
  city: CityName;
};

export type MockServerData = {
  offers: OfferTemplate[];
};
