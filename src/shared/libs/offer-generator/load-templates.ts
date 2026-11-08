import axios from 'axios';
import { MockServerData, OfferTemplate } from '../../types/mock-server-data.type.js';
import { CITY_LOCATIONS, CityName, UserType } from '../../types/index.js';
import { parseOffer } from '../file-reader/parse-offer.js';
import { serializeOffer } from './serialize-offer.js';
import { OfferGenerator } from './offer-generator.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTemplate(value: unknown): OfferTemplate {
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
  const template: OfferTemplate = {
    title: value.title,
    description: value.description,
    city: value.city as CityName,
    previewImage: value.previewImage,
    images: value.images,
    author: {
      name: value.author.name,
      email: value.author.email,
      password: value.author.password,
      avatar: value.author.avatar,
      type: value.author.type as UserType
    }
  };
  parseOffer(serializeOffer(new OfferGenerator([template]).generate()).trimEnd());
  return template;
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
