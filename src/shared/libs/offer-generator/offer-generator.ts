import { Amenity, CITY_LOCATIONS, HousingType, Offer } from '../../types/index.js';
import { OfferTemplate } from '../../types/mock-server-data.type.js';
import { randomItem, randomItems, randomNumber } from '../../helpers/random.js';
import { OFFER_LIMITS } from '../../constants/offer-limits.js';

export class OfferGenerator {
  constructor(private readonly templates: OfferTemplate[]) {}

  public generate(): Offer {
    const template = randomItem(this.templates);
    const location = CITY_LOCATIONS[template.city];
    return {
      ...template,
      city: { name: template.city, location: { ...location } },
      postDate: new Date(Date.now() - randomNumber(0, 30 * 24 * 60 * 60) * 1000),
      isPremium: randomNumber(0, 1) === 1,
      isFavorite: false,
      rating: randomNumber(OFFER_LIMITS.rating.min * OFFER_LIMITS.rating.precision,
        OFFER_LIMITS.rating.max * OFFER_LIMITS.rating.precision) / OFFER_LIMITS.rating.precision,
      housingType: randomItem(Object.values(HousingType)),
      roomsCount: randomNumber(OFFER_LIMITS.rooms.min, OFFER_LIMITS.rooms.max),
      guestsCount: randomNumber(OFFER_LIMITS.guests.min, OFFER_LIMITS.guests.max),
      price: randomNumber(OFFER_LIMITS.price.min, OFFER_LIMITS.price.max),
      amenities: randomItems(Object.values(Amenity)),
      commentCount: 0,
      location: {
        latitude: Number((location.latitude + randomNumber(-100, 100) / 10000).toFixed(6)),
        longitude: Number((location.longitude + randomNumber(-100, 100) / 10000).toFixed(6))
      }
    };
  }
}
