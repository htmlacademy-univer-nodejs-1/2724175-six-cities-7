import { Amenity, CITY_LOCATIONS, CityName, HousingType, Offer, UserType } from '../../types/index.js';

function text(value: string, field: string, min: number, max: number): string {
  if (value.length < min || value.length > max) {
    throw new Error(`${field}: ожидается от ${min} до ${max} символов.`);
  }
  return value;
}

function numeric(value: string, field: string, min: number, max: number, integer = true): number {
  const result = Number(value);
  if (!value || !Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) {
    throw new Error(`${field}: ожидается ${integer ? 'целое ' : ''}число от ${min} до ${max}.`);
  }
  return result;
}

function choice<T extends string>(value: string, values: readonly T[], field: string): T {
  const result = values.find((item) => item === value);
  if (result === undefined) {
    throw new Error(`${field}: недопустимое значение «${value}».`);
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
  const date = new Date(postDate);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(postDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== postDate.slice(0, 10)) {
    throw new Error('Дата публикации: ожидается корректная дата ISO 8601.');
  }

  const photos = images.split(';').map((image) => image.trim());
  if (photos.length !== 6 || photos.some((image) => !image)) {
    throw new Error('Фотографии: требуется ровно 6 непустых ссылок.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    throw new Error('Email автора: некорректный адрес.');
  }
  if (authorAvatar && !/\.(jpg|png)$/i.test(authorAvatar)) {
    throw new Error('Аватар: ожидается файл .jpg или .png.');
  }
  const parsedRating = numeric(rating, 'Рейтинг', 1, 5, false);
  if (!/^\d(?:\.\d)?$/.test(rating)) {
    throw new Error('Рейтинг: допускается не более одного знака после точки.');
  }

  return {
    title: text(title, 'Наименование', 10, 100),
    description: text(description, 'Описание', 20, 1024),
    postDate: date,
    city: { name: city, location: { ...CITY_LOCATIONS[city] } },
    previewImage: text(previewImage, 'Превью', 1, Infinity),
    images: photos,
    isPremium: boolean(isPremium, 'Премиум'),
    isFavorite: boolean(isFavorite, 'Избранное'),
    rating: parsedRating,
    housingType: choice(housingType, Object.values(HousingType), 'Тип жилья'),
    roomsCount: numeric(roomsCount, 'Количество комнат', 1, 8),
    guestsCount: numeric(guestsCount, 'Количество гостей', 1, 10),
    price: numeric(price, 'Стоимость', 100, 100000),
    amenities: amenities.split(';').map((item) => choice(item.trim(), Object.values(Amenity), 'Удобства')),
    author: {
      name: text(authorName, 'Имя автора', 1, 15),
      email: authorEmail,
      ...(authorAvatar ? { avatar: authorAvatar } : {}),
      password: text(authorPassword, 'Пароль автора', 6, 12),
      type: choice(authorType, Object.values(UserType), 'Тип пользователя')
    },
    commentCount: 0,
    location: {
      latitude: numeric(latitude, 'Широта', -90, 90, false),
      longitude: numeric(longitude, 'Долгота', -180, 180, false)
    }
  };
}
