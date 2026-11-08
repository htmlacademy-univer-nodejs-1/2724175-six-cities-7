import axios from 'axios';
import { MockServerData, OfferTemplate } from '../../types/mock-server-data.type.js';
import { CITY_LOCATIONS, CityName, UserType } from '../../types/index.js';
import { OFFER_LIMITS, USER_LIMITS } from '../../constants/offer-limits.js';
import { avatar, choice, email, photos, text } from '../../helpers/validation.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function templateText(value: string, field: string, min = 1, max = Infinity): string {
  if (/[\t\r\n]/.test(value)) {
    throw new Error('Поля TSV не должны содержать табуляции или переводы строк.');
  }
  return text(value.trim(), field, min, max);
}

export function parseTemplate(value: unknown): OfferTemplate {
  if (!isRecord(value) || !isRecord(value.author)
    || typeof value.title !== 'string' || typeof value.description !== 'string'
    || typeof value.previewImage !== 'string' || typeof value.city !== 'string'
    || !Object.hasOwn(CITY_LOCATIONS, value.city)
    || !Array.isArray(value.images) || !value.images.every((image: unknown) => typeof image === 'string')
    || typeof value.author.name !== 'string' || typeof value.author.email !== 'string'
    || typeof value.author.password !== 'string'
    || (value.author.avatar !== undefined && typeof value.author.avatar !== 'string')
    || !Object.values(UserType).includes(value.author.type as UserType)) {
    throw new Error('Некорректная структура заготовки предложения.');
  }
  const images = value.images.map((image: string) => templateText(image, 'Фотография'));
  if (images.some((image: string) => image.includes(';'))) {
    throw new Error('Ссылки на фотографии не должны содержать разделитель «;».');
  }
  const authorAvatar = avatar(templateText(value.author.avatar ?? '', 'Аватар', 0));
  return {
    title: templateText(value.title, 'Наименование', OFFER_LIMITS.title.min, OFFER_LIMITS.title.max),
    description: templateText(value.description, 'Описание', OFFER_LIMITS.description.min, OFFER_LIMITS.description.max),
    city: choice(value.city, Object.keys(CITY_LOCATIONS) as CityName[], 'Город'),
    previewImage: templateText(value.previewImage, 'Превью'),
    images: photos(images),
    author: {
      name: templateText(value.author.name, 'Имя автора', USER_LIMITS.name.min, USER_LIMITS.name.max),
      email: email(templateText(value.author.email, 'Email автора')),
      password: templateText(value.author.password, 'Пароль автора', USER_LIMITS.password.min, USER_LIMITS.password.max),
      ...(authorAvatar ? { avatar: authorAvatar } : {}),
      type: choice(String(value.author.type), Object.values(UserType), 'Тип пользователя')
    }
  };
}

export async function loadTemplates(url: string): Promise<MockServerData> {
  const address = new URL(url);
  if (!['http:', 'https:'].includes(address.protocol)) {
    throw new Error('Ожидается HTTP или HTTPS URL сервера.');
  }
  const { data } = await axios.get<unknown>(address.href, {
    timeout: 10000,
    maxContentLength: 1024 * 1024,
    responseType: 'json'
  });
  if (!isRecord(data) || !Array.isArray(data.offers) || !data.offers.length) {
    throw new Error('Ответ сервера должен содержать непустой массив offers.');
  }
  return { offers: data.offers.map(parseTemplate) };
}
