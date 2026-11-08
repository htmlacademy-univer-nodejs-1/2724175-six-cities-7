import { Amenity, CITY_LOCATIONS, CityName, HousingType, Offer, UserType } from '../../types/index.js';
import { OFFER_LIMITS, USER_LIMITS } from '../../constants/offer-limits.js';
import { avatar, choice, email, isoDate, photos, text } from '../../helpers/validation.js';

function numeric(value: string, field: string, min: number, max: number, integer = true): number {
  const result = Number(value);
  if (!value || !Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) {
    throw new Error(`${field}: ожидается ${integer ? 'целое ' : ''}число от ${min} до ${max}.`);
  }
  return result;
}

function boolean(value: string, field: string): boolean {
  return choice(value, ['true', 'false'], field) === 'true';
}

export function parseOffer(line: string): Offer {
  const fields = line.split('\t').map((field) => field.trim());
  if (fields.length !== 21) {
    throw new Error(`Ожидается 21 колонка TSV, получено ${fields.length}.`);
  }

  const [title, description, postDate, cityName, previewImage, images, isPremium,
    isFavorite, rating, housingType, roomsCount, guestsCount, price, amenities,
    authorName, authorEmail, authorAvatar, authorPassword, authorType, latitude, longitude] = fields;

  const city = choice(cityName, Object.keys(CITY_LOCATIONS) as CityName[], 'Город');
  const parsedRating = numeric(rating, 'Рейтинг', OFFER_LIMITS.rating.min, OFFER_LIMITS.rating.max, false);
  if (!/^\d(?:\.\d)?$/.test(rating)) {
    throw new Error('Рейтинг: допускается не более одного знака после точки.');
  }

  return {
    title: text(title, 'Наименование', OFFER_LIMITS.title.min, OFFER_LIMITS.title.max),
    description: text(description, 'Описание', OFFER_LIMITS.description.min, OFFER_LIMITS.description.max),
    postDate: isoDate(postDate),
    city: { name: city, location: { ...CITY_LOCATIONS[city] } },
    previewImage: text(previewImage, 'Превью', 1, Infinity),
    images: photos(images.split(';').map((image) => image.trim())),
    isPremium: boolean(isPremium, 'Премиум'),
    isFavorite: boolean(isFavorite, 'Избранное'),
    rating: parsedRating,
    housingType: choice(housingType, Object.values(HousingType), 'Тип жилья'),
    roomsCount: numeric(roomsCount, 'Количество комнат', OFFER_LIMITS.rooms.min, OFFER_LIMITS.rooms.max),
    guestsCount: numeric(guestsCount, 'Количество гостей', OFFER_LIMITS.guests.min, OFFER_LIMITS.guests.max),
    price: numeric(price, 'Стоимость', OFFER_LIMITS.price.min, OFFER_LIMITS.price.max),
    amenities: amenities.split(';').map((item) => choice(item.trim(), Object.values(Amenity), 'Удобства')),
    author: {
      name: text(authorName, 'Имя автора', USER_LIMITS.name.min, USER_LIMITS.name.max),
      email: email(authorEmail),
      ...(authorAvatar ? { avatar: avatar(authorAvatar) } : {}),
      password: text(authorPassword, 'Пароль автора', USER_LIMITS.password.min, USER_LIMITS.password.max),
      type: choice(authorType, Object.values(UserType), 'Тип пользователя')
    },
    commentCount: 0,
    location: {
      latitude: numeric(latitude, 'Широта', OFFER_LIMITS.latitude.min, OFFER_LIMITS.latitude.max, false),
      longitude: numeric(longitude, 'Долгота', OFFER_LIMITS.longitude.min, OFFER_LIMITS.longitude.max, false)
    }
  };
}
