import { OFFER_LIMITS } from '../constants/offer-limits.js';

export function text(value: string, field: string, min: number, max: number): string {
  if (value.length < min || value.length > max) {
    throw new Error(`${field}: ожидается от ${min} до ${max} символов.`);
  }
  return value;
}

export function choice<T extends string>(value: string, values: readonly T[], field: string): T {
  const result = values.find((item) => item === value);
  if (result === undefined) {
    throw new Error(`${field}: недопустимое значение «${value}».`);
  }
  return result;
}

export function photos(images: string[]): string[] {
  if (images.length !== OFFER_LIMITS.imagesCount || images.some((image) => !image)) {
    throw new Error(`Фотографии: требуется ровно ${OFFER_LIMITS.imagesCount} непустых ссылок.`);
  }
  return images;
}

export function email(value: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Email автора: некорректный адрес.');
  }
  return value;
}

export function avatar(value: string): string {
  if (value && !/\.(jpg|png)$/i.test(value)) {
    throw new Error('Аватар: ожидается файл .jpg или .png.');
  }
  return value;
}

export function isoDate(value: string): Date {
  const date = new Date(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (match && !Number.isNaN(date.getTime())) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const calendarDate = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
    if (calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() + 1 === month
      && calendarDate.getUTCDate() === day && (!value.includes('T') || Number(value.slice(11, 13)) < 24)) {
      return date;
    }
  }
  throw new Error('Дата публикации: ожидается корректная дата ISO 8601.');
}
