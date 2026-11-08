import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isoDate } from '../dist/shared/helpers/validation.js';
import { parseTemplate } from '../dist/shared/libs/offer-generator/load-templates.js';
import { OfferGenerator } from '../dist/shared/libs/offer-generator/offer-generator.js';
import { serializeOffer } from '../dist/shared/libs/offer-generator/serialize-offer.js';
import { parseOffer } from '../dist/shared/libs/file-reader/parse-offer.js';
import { OFFER_LIMITS } from '../dist/shared/constants/offer-limits.js';

const template = JSON.parse(await readFile(new URL('../mocks/mock-server-data.json', import.meta.url), 'utf8')).api.offers[0];

test('ISO-даты со смещением принимаются при переходе через границу суток', () => {
  for (const [input, expected] of [
    ['2026-11-08T00:30:00+03:00', '2026-11-07T21:30:00.000Z'],
    ['2026-12-31T23:30:00-03:00', '2027-01-01T02:30:00.000Z'],
    ['2024-02-29', '2024-02-29T00:00:00.000Z']
  ]) {
    assert.equal(isoDate(input).toISOString(), expected);
    const fields = serializeOffer(new OfferGenerator([template]).generate()).trimEnd().split('\t');
    fields[2] = input;
    assert.equal(parseOffer(fields.join('\t')).postDate.toISOString(), expected);
  }
});

test('некорректные календарные даты и время отклоняются независимо от смещения', () => {
  for (const input of ['2026-02-30', '2025-02-29T01:00:00+03:00',
    '2026-04-31T23:00:00-03:00', '2026-13-01', '2026-11-08T24:00:00Z',
    '2026-11-08T12:60:00Z', '2026-11-08T12:00:00+25:00', 'invalid']) {
    assert.throws(() => isoDate(input), /Дата публикации/, input);
  }
});

test('заготовка явно проверяется и нормализуется без генерации', () => {
  const input = structuredClone(template);
  input.title = `  ${input.title}  `;
  input.author.email = ` ${input.author.email} `;
  input.author.avatar = '   ';
  const parsed = parseTemplate(input);
  assert.equal(parsed.title, template.title);
  assert.equal(parsed.author.email, template.author.email);
  assert.equal(parsed.author.avatar, undefined);
  assert.equal(input.author.avatar, '   ');
  const offer = new OfferGenerator([parsed]).generate();
  assert.deepEqual(parseOffer(serializeOffer(offer).trimEnd()), offer);
});

test('неправильные поля заготовки отклоняются до записи', () => {
  for (const mutate of [
    (value) => { value.title = 'x'.repeat(OFFER_LIMITS.title.min - 1); },
    (value) => { value.description = 'x'.repeat(OFFER_LIMITS.description.max + 1); },
    (value) => { value.images.pop(); },
    (value) => { value.images[0] = '  '; },
    (value) => { value.images[0] = 'https://example.com/a;b.jpg'; },
    (value) => { value.title += '\t'; },
    (value) => { value.description += '\n'; },
    (value) => { value.author.email = 'invalid'; },
    (value) => { value.author.avatar = 'avatar.gif'; },
    (value) => { value.author.password = 'short'; },
    (value) => { value.author.type = 'admin'; },
    (value) => { value.city = 'London'; }
  ]) {
    const input = structuredClone(template);
    mutate(input);
    assert.throws(() => parseTemplate(input));
  }
});

test('границы из общих ограничений принимаются парсером', () => {
  for (const boundary of ['min', 'max']) {
    const offer = new OfferGenerator([parseTemplate(template)]).generate();
    offer.title = 'x'.repeat(OFFER_LIMITS.title[boundary]);
    offer.description = 'x'.repeat(OFFER_LIMITS.description[boundary]);
    offer.roomsCount = OFFER_LIMITS.rooms[boundary];
    offer.guestsCount = OFFER_LIMITS.guests[boundary];
    offer.price = OFFER_LIMITS.price[boundary];
    offer.rating = OFFER_LIMITS.rating[boundary];
    assert.deepEqual(parseOffer(serializeOffer(offer).trimEnd()), offer);
  }
});
