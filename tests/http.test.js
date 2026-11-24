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
const missingId = '6329c3d6a04ab1061c6425eb';
const offerBody = Object.fromEntries([
  'title', 'price', 'housingType', 'isPremium', 'previewImage', 'description', 'images',
  'roomsCount', 'guestsCount', 'amenities', 'location'
].map((key) => [key, fields[key]]));
Object.assign(offerBody, { city: 'Paris', authorId: id });
const commentBody = { text: 'Отличная квартира!', rating: 4, authorId: id };

async function start(t, overrides = {}) {
  const container = createContainer();
  const logs = [];
  container.rebind(Component.Logger).toConstantValue({ info() {}, warn() {}, error: (...args) => logs.push(args) });
  const config = { PORT: 0, DB_HOST: '127.0.0.1', DB_PORT: 27017, DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'test', SALT: 'test' };
  container.rebind(Component.Config).toConstantValue({ get: (key) => config[key] });
  container.rebind(Component.DatabaseClient).toConstantValue({ connect: async () => {}, disconnect: async () => {} });
  container.rebind(Component.OfferService).toConstantValue({
    find: async () => [offer], findPremiumByCity: async () => [offer], findById: async (value) => value === id ? offer : null,
    exists: async (value) => value === id,
    ...overrides.offers
  });
  container.rebind(Component.UserService).toConstantValue({
    create: async () => user, findById: async (value) => value === id ? user : null, ...overrides.users
  });
  container.rebind(Component.CommentService).toConstantValue({ ...overrides.comments });
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

test('заглушки возвращают 501 после проверки входных данных', async (t) => {
  const { request } = await start(t);
  assert.equal((await request('/users/login', json('{}'))).status, 400);
  assert.equal((await request('/users/login', json(JSON.stringify({ email: user.email, password: 'demo1234' })))).status, 501);
  assert.equal((await request('/users/login/me')).status, 501);
  assert.equal((await request('/users/invalid/avatar', { method: 'POST' })).status, 400);
  assert.equal((await request(`/users/${id}/avatar`, { method: 'POST' })).status, 501);
  assert.equal((await request('/images', { method: 'POST' })).status, 501);
});

test('анонимный клиент создаёт предложение с указанным автором', async (t) => {
  let input;
  const { request } = await start(t, { offers: { create: async (dto) => { input = dto; return offer; } } });
  const response = await request('/offers', json(JSON.stringify(offerBody)));
  assert.equal(response.status, 201);
  assert.equal(String(input.author), id);
  assert.deepEqual(input.city, { name: 'Paris', location });
  assert.equal((await response.json()).author.id, id);
  assert.equal((await request('/offers', json(JSON.stringify({ ...offerBody, authorId: missingId })))).status, 404);
});

test('анонимный клиент обновляет и удаляет существующее предложение', async (t) => {
  const { request } = await start(t, { offers: {
    updateById: async (value, dto) => {
      assert.equal(dto.price, 200);
      return value === id ? { ...offer, toObject: () => ({ ...fields, price: dto.price }) } : null;
    }, deleteById: async (value) => value === id ? offer : null
  } });
  const patch = { ...json('{"price":200}'), method: 'PATCH' };
  assert.equal((await (await request(`/offers/${id.toUpperCase()}`, patch)).json()).price, 200);
  assert.equal((await request(`/offers/${missingId}`, patch)).status, 404);
  const deleted = await request(`/offers/${id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  assert.equal((await request(`/offers/${missingId}`, { method: 'DELETE' })).status, 404);
});

test('избранное добавляется, перечисляется и удаляется по userId из query', async (t) => {
  let saved = false;
  const { request } = await start(t, { offers: { findFavorites: async (userId) => {
    assert.equal(userId, id);
    return saved ? [offer] : [];
  } }, users: {
    addToFavorites: async (userId, offerId) => { assert.deepEqual([userId, offerId], [id, id]); saved = true; return user; },
    removeFromFavorites: async (userId, offerId) => { assert.deepEqual([userId, offerId], [id, id]); saved = false; return user; }
  } });
  const query = `?userId=${id}`;
  const path = `/favorites/${id}${query}`;
  assert.equal((await (await request(path, { method: 'POST' })).json()).isFavorite, true);
  assert.equal((await (await request(`/favorites${query}`)).json())[0].isFavorite, true);
  assert.equal((await (await request(path, { method: 'DELETE' })).json()).isFavorite, false);
  assert.deepEqual(await (await request(`/favorites${query}`)).json(), []);
  assert.equal((await request(`/favorites?userId=${missingId}`)).status, 404);
  assert.equal((await request(`/favorites/${missingId}${query}`, { method: 'POST' })).status, 404);
});

test('комментарии можно добавить и прочитать, но нельзя изменить или удалить напрямую', async (t) => {
  const comments = [];
  const { request } = await start(t, { comments: {
    findByOfferId: async (value) => { assert.equal(value, id); return comments; },
    create: async (dto) => {
      assert.deepEqual([String(dto.offer), String(dto.author)], [id, id]);
      const comment = { ...dto, id, author: user, postDate: fields.postDate };
      comments.push(comment);
      return comment;
    }
  } });
  const path = `/offers/${id}/comments`;
  const created = await request(path, json(JSON.stringify(commentBody)));
  assert.equal(created.status, 201);
  const comment = await created.json();
  assert.deepEqual(Object.keys(comment).sort(), ['author', 'id', 'postDate', 'rating', 'text']);
  assert.equal(comment.author.id, id);
  assert.equal('password' in comment.author, false);
  assert.deepEqual(await (await request(path)).json(), [comment]);
  assert.equal((await request(path, { method: 'DELETE' })).status, 404);
  assert.equal((await request(path, { ...json('{}'), method: 'PATCH' })).status, 404);
  assert.equal((await request(`/offers/${missingId}/comments`)).status, 404);
  assert.equal((await request(path, json(JSON.stringify({ ...commentBody, authorId: missingId })))).status, 404);
});

test('валидация отклоняет некорректные ObjectId и query до вызова сервисов', async (t) => {
  const unexpected = () => assert.fail('Невалидный запрос передан в сервис');
  const { request } = await start(t, { offers: {
    find: unexpected, findById: unexpected, findPremiumByCity: unexpected, exists: unexpected,
    updateById: unexpected, deleteById: unexpected
  }, users: { findById: unexpected } });
  const paths = [
    ['/offers?limit=0'], ['/offers?limit=1&limit=2'], ['/offers?limit=9007199254740992'], ['/offers/cities/Rome/premium'],
    ['/offers/bad'], ['/offers/bad', 'PATCH'], ['/offers/bad', 'DELETE'], ['/offers/bad/comments'],
    ['/offers/bad/comments', 'POST'], ['/favorites'], ['/favorites?userId=bad'],
    [`/favorites/bad?userId=${id}`, 'POST'], [`/favorites/bad?userId=${id}`, 'DELETE']
  ];
  for (const [path, method] of paths) {
    assert.equal((await request(path, { method })).status, 400, `${method ?? 'GET'} ${path}`);
  }
});

test('валидация DTO не передаёт невалидное тело в сервисы', async (t) => {
  const unexpected = () => assert.fail('Невалидный запрос передан в сервис');
  const { request } = await start(t, { offers: { updateById: unexpected, create: unexpected, exists: unexpected },
    users: { findById: unexpected, create: unexpected }, comments: { create: unexpected } });
  for (const body of [[], {}, { ...offerBody, images: [] }, { ...offerBody, location: [{ ...location }] },
    { ...offerBody, location: { ...location, latitude: 91 } }, { ...offerBody, authorId: 'bad' },
    { ...offerBody, price: '150' }, { ...offerBody, rating: 5 }]) {
    assert.equal((await request('/offers', json(JSON.stringify(body)))).status, 400);
  }
  for (const body of [{}, { price: null }, { authorId: id }, { location: { latitude: 50 } }]) {
    assert.equal((await request(`/offers/${id}`, { ...json(JSON.stringify(body)), method: 'PATCH' })).status, 400);
  }
  for (const body of [{ ...commentBody, text: 'да' }, { ...commentBody, rating: 4.5 }, { ...commentBody, postDate: fields.postDate }]) {
    assert.equal((await request(`/offers/${id}/comments`, json(JSON.stringify(body)))).status, 400);
  }
  const registerBody = { name: user.name, email: user.email, password: 'demo1234', type: user.type };
  for (const body of [{ ...registerBody, email: 'bad' }, { ...registerBody, password: 'short' },
    { ...registerBody, avatarPath: 'https://example.com/avatar.gif' }]) {
    assert.equal((await request('/users/register', json(JSON.stringify(body)))).status, 400);
  }
});
