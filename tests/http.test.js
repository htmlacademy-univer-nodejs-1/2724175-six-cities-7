import 'reflect-metadata';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { Component } from '../dist/shared/di/component.js';
import { createContainer } from '../dist/shared/di/container.js';
import { CITY_LOCATIONS } from '../dist/shared/types/index.js';

const id = '6329c3d6a04ab1061c6425ea';
const user = { id, name: 'Гость', email: 'guest@example.com', type: 'обычный', password: 'не для ответа' };
const location = CITY_LOCATIONS.Paris;
const fields = {
  title: 'Тестовая квартира', price: 150, housingType: 'apartment', city: { name: 'Paris', location },
  postDate: new Date('2026-10-01T10:00:00Z'), isPremium: true, rating: 4, commentCount: 2,
  previewImage: 'https://example.com/preview.jpg', description: 'Квартира рядом с центральным парком.',
  images: Array(6).fill('https://example.com/photo.jpg'), roomsCount: 2, guestsCount: 3,
  amenities: ['Washer'], location, ratingSum: 8
};
const offer = { ...fields, id, author: user, toObject: () => fields };

async function start(t, overrides = {}) {
  const container = createContainer();
  const logs = [];
  container.rebind(Component.Logger).toConstantValue({ info() {}, warn() {}, error: (...args) => logs.push(args) });
  const config = { PORT: 0, DB_HOST: '127.0.0.1', DB_PORT: 27017, DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'test', SALT: 'test' };
  container.rebind(Component.Config).toConstantValue({ get: (key) => config[key] });
  container.rebind(Component.DatabaseClient).toConstantValue({ connect: async () => {}, disconnect: async () => {} });
  container.rebind(Component.OfferService).toConstantValue({
    find: async () => [offer], findPremiumByCity: async () => [offer], findById: async (value) => value === id ? offer : null,
    ...overrides.offers
  });
  container.rebind(Component.UserService).toConstantValue({ create: async () => user, ...overrides.users });
  if (overrides.currentUser) container.rebind(Component.CurrentUser).toConstantValue(overrides.currentUser);
  const server = await container.get(Component.Application).init();
  t.after(async () => {
    const closed = once(server, 'close');
    server.close();
    await closed;
  });
  return { request: (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options), logs };
}

const json = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body });

test('Express возвращает краткие и полные предложения без внутренних полей', async (t) => {
  const { request } = await start(t);
  const response = await request('/offers?limit=3');
  assert.equal(response.status, 200);
  const [preview] = await response.json();
  assert.equal(preview.city, 'Paris');
  assert.equal(preview.isFavorite, false);
  assert.equal('description' in preview, false);
  assert.equal('ratingSum' in preview, false);
  assert.equal((await request('/offers/cities/Paris/premium')).status, 200);
  const detail = await (await request(`/offers/${id}`)).json();
  assert.equal(detail.author.id, id);
  assert.equal('password' in detail.author, false);
  assert.deepEqual(detail.location, location);
});

test('регистрация возвращает 201 без пароля, а повторный email — 409', async (t) => {
  let calls = 0;
  const { request } = await start(t, { users: { create: async (dto) => {
    assert.equal(dto.email, user.email);
    if (calls++) throw Object.assign(new Error('duplicate'), { code: 11000 });
    return user;
  } } });
  const body = JSON.stringify({ name: user.name, email: user.email, password: 'demo1234', type: user.type });
  const created = await request('/users/register', json(body));
  assert.equal(created.status, 201);
  assert.equal('password' in await created.json(), false);
  assert.equal((await request('/users/register', json(body))).status, 409);
});

test('фильтр разделяет некорректный запрос, отсутствующий маршрут и сбой сервера', async (t) => {
  const { request, logs } = await start(t, { offers: { find: async () => { throw new Error('Внутренняя деталь'); } } });
  assert.equal((await request('/users/register', json('{'))).status, 400);
  assert.equal((await request('/offers/not-an-id')).status, 400);
  assert.equal((await request('/missing')).status, 404);
  const failure = await request('/offers');
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: 'Внутренняя ошибка сервера.' });
  assert.equal(logs[0][1].message, 'Внутренняя деталь');
});

test('защищённые маршруты не допускают анонимные запросы', async (t) => {
  const { request } = await start(t);
  assert.equal((await request('/offers', json('{}'))).status, 401);
  assert.equal((await request('/favorites')).status, 401);
});

test('отложенные операции возвращают 501, комментарии не зарегистрированы', async (t) => {
  const { request } = await start(t);
  assert.equal((await request('/users/login', json('{}'))).status, 501);
  assert.equal((await request('/users/login/me')).status, 501);
  assert.equal((await request(`/users/${id}/avatar`, { method: 'POST' })).status, 501);
  assert.equal((await request('/images', { method: 'POST' })).status, 501);
  assert.equal((await request(`/offers/${id}/comments`)).status, 404);
});

const currentUser = async () => ({ id, favorites: [] });

test('создание предложения использует автора из контекста и преобразует город', async (t) => {
  let input;
  const { request } = await start(t, { currentUser, offers: { create: async (dto) => { input = dto; return offer; } } });
  const response = await request('/offers', json(JSON.stringify({ ...fields, city: 'Paris', author: 'чужой ID' })));
  assert.equal(response.status, 201);
  assert.equal(String(input.author), id);
  assert.deepEqual(input.city, { name: 'Paris', location });
  assert.equal((await response.json()).author.id, id);
});

test('владелец обновляет и удаляет предложение, другому пользователю отказано', async (t) => {
  let owns = false;
  const { request } = await start(t, { currentUser, offers: {
    exists: async () => true, isAuthor: async () => owns,
    updateById: async (_id, dto) => {
      assert.equal(dto.price, 200);
      return { ...offer, toObject: () => ({ ...fields, price: dto.price }) };
    }, deleteById: async () => offer
  } });
  const path = `/offers/${id}`;
  const patch = { ...json('{"price":200}'), method: 'PATCH' };
  assert.equal((await request(path, patch)).status, 403);
  assert.equal((await request(path, { method: 'DELETE' })).status, 403);
  owns = true;
  assert.equal((await (await request(path, patch)).json()).price, 200);
  const deleted = await request(path, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
});

test('избранное использует ID текущего пользователя, а не ID из запроса', async (t) => {
  let saved = false;
  const { request } = await start(t, { currentUser, offers: { findFavorites: async (userId) => {
    assert.equal(userId, id);
    return saved ? [offer] : [];
  } }, users: {
    addToFavorites: async (userId, offerId) => { assert.deepEqual([userId, offerId], [id, id]); saved = true; },
    removeFromFavorites: async (userId, offerId) => { assert.deepEqual([userId, offerId], [id, id]); saved = false; }
  } });
  const path = `/favorites/${id}`;
  assert.equal((await (await request(path, { method: 'POST' })).json()).isFavorite, true);
  assert.equal((await (await request('/favorites')).json())[0].isFavorite, true);
  assert.equal((await (await request(path, { method: 'DELETE' })).json()).isFavorite, false);
  assert.deepEqual(await (await request('/favorites')).json(), []);
});
