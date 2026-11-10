import 'reflect-metadata';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { Container } from 'inversify';
import { Types } from 'mongoose';
import { registerDatabase } from '../dist/shared/di/database-container.js';
import { Component } from '../dist/shared/di/component.js';
import { CITY_LOCATIONS } from '../dist/shared/types/index.js';

const uri = process.env.MONGO_TEST_URI;

function offerInput(author) {
  return {
    title: 'Тестовая квартира', description: 'Описание тестового предложения для проверки сервисов.',
    city: { name: 'Paris', location: CITY_LOCATIONS.Paris },
    previewImage: 'https://example.com/preview.jpg',
    images: Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.jpg`),
    isPremium: true, housingType: 'apartment', roomsCount: 2, guestsCount: 3,
    price: 150, amenities: ['Washer'], location: CITY_LOCATIONS.Paris, author
  };
}

describe('сервисы MongoDB', { skip: !uri }, () => {
  let connection;
  let container;
  let users;
  let offers;
  let comments;
  let user;
  let other;
  let dbName;

  beforeEach(async () => {
    container = new Container();
    container.bind(Component.Logger).toConstantValue({ info() {}, error() {} });
    registerDatabase(container);
    connection = container.get(Component.DatabaseConnection);
    dbName = `six-cities-services-test-${new Types.ObjectId()}`;
    await connection.openUri(uri, { dbName });
    users = container.get(Component.UserService);
    offers = container.get(Component.OfferService);
    comments = container.get(Component.CommentService);
    user = await users.create({ name: 'Тест', email: 'test@example.com', password: 'demo1234', type: 'pro' }, 'test-only-salt');
    other = await users.create({ name: 'Гость', email: 'guest@example.com', password: 'demo1234', type: 'обычный' }, 'test-only-salt');
  });

  afterEach(async () => {
    try {
      if (connection?.readyState === 1 && connection.name === dbName) await connection.dropDatabase();
    } finally {
      await connection?.close();
    }
  });

  async function createComments(offer, ratings) {
    return Promise.all(ratings.map((rating) => comments.create({
      text: 'Тестовый комментарий', rating, author: other._id, offer: offer._id
    })));
  }

  it('находит пользователя и обновляет аватар без изменения имени', async () => {
    assert.equal((await users.findByEmail(user.email)).id, user.id);
    assert.equal((await users.updateById(user.id, { avatar: 'avatar.png' })).avatar, 'avatar.png');
    assert.equal((await users.findById(user.id)).name, 'Тест');
  });

  it('создаёт предложение с нулевыми агрегатами и проверяет авторство', async () => {
    const offer = await offers.create({ ...offerInput(user._id), rating: 5, commentCount: 99 });
    assert.equal(offer.commentCount, 0);
    assert.equal(offer.rating, 0);
    assert.equal(await offers.exists(offer.id), true);
    assert.equal(await offers.isAuthor(offer.id, user.id), true);
    assert.equal(await offers.isAuthor(offer.id, other.id), false);
    assert.equal((await offers.findById(offer.id)).author.password, undefined);
  });

  it('обновляет только разрешённые поля предложения', async () => {
    const offer = await offers.create(offerInput(user._id));
    await offers.updateById(offer.id, { price: 250, author: other._id, commentCount: 99 });
    const updated = await offers.findById(offer.id);
    assert.equal(updated.price, 250);
    assert.equal(updated.title, offer.title);
    assert.equal(updated.author.id, user.id);
    assert.equal(updated.commentCount, 0);
  });

  it('добавляет избранное без дублей, разделяет пользователей и удаляет ссылку', async () => {
    const offer = await offers.create(offerInput(user._id));
    await users.addToFavorites(user.id, offer.id);
    await users.addToFavorites(user.id, offer.id);
    assert.equal((await offers.findFavorites(user.id)).length, 1);
    assert.equal((await offers.findFavorites(other.id)).length, 0);
    await users.removeFromFavorites(user.id, offer.id);
    assert.equal((await offers.findFavorites(user.id)).length, 0);
  });

  it('пересчитывает среднее после каждой оценки без накопления округлений', async () => {
    const offer = await offers.create(offerInput(user._id));
    const ratings = [1, 2, 2, 5, 3, 4, 1];
    let sum = 0;
    for (const [index, rating] of ratings.entries()) {
      const comment = await comments.create({ text: 'Тестовый комментарий', rating, author: other._id, offer: offer._id });
      assert.equal(comment.author.password, undefined);
      sum += rating;
      const aggregate = await offers.findById(offer.id);
      assert.equal(aggregate.commentCount, index + 1);
      assert.equal(aggregate.ratingSum, sum);
      assert.equal(aggregate.rating, Math.round(sum / (index + 1) * 10) / 10);
    }
  });

  it('сохраняет все оценки при параллельном добавлении комментариев', async () => {
    const offer = await offers.create(offerInput(user._id));
    const ratings = Array.from({ length: 50 }, (_, i) => i % 5 + 1);
    await createComments(offer, ratings);
    const aggregate = await offers.findById(offer.id);
    const sum = ratings.reduce((a, b) => a + b, 0);
    assert.equal(aggregate.commentCount, ratings.length);
    assert.equal(aggregate.ratingSum, sum);
    assert.equal(aggregate.rating, Math.round(sum / ratings.length * 10) / 10);
  });

  it('возвращает 50 последних комментариев в порядке убывания даты', async () => {
    const offer = await offers.create(offerInput(user._id));
    const model = container.get(Component.CommentModel);
    await model.insertMany(Array.from({ length: 55 }, (_, i) => ({
      text: 'Тестовый комментарий', rating: 4, author: user._id, offer: offer._id,
      postDate: new Date(2026, 0, i + 1)
    })));
    const recent = await comments.findByOfferId(offer.id);
    assert.equal(recent.length, 50);
    assert.equal(recent[0].postDate.getTime(), new Date(2026, 0, 55).getTime());
    assert.equal(recent[49].postDate.getTime(), new Date(2026, 0, 6).getTime());
    assert.ok(recent.every((comment, i) => !i || recent[i - 1].postDate >= comment.postDate));
  });

  it('отклоняет комментарий и избранное для отсутствующего предложения', async () => {
    const missingId = new Types.ObjectId();
    await assert.rejects(comments.create({ text: 'Нет предложения', rating: 5, author: user._id, offer: missingId }), /не найдено/);
    assert.equal(await container.get(Component.CommentModel).countDocuments({ offer: missingId }), 0);
    await assert.rejects(users.addToFavorites(user.id, missingId.toString()), /не найдено/);
  });

  it('возвращает 60 предложений по умолчанию и допускает больший лимит', async () => {
    await container.get(Component.OfferModel).insertMany(Array.from({ length: 63 }, (_, i) => ({
      ...offerInput(user._id), postDate: new Date(2026, 0, i + 1)
    })));
    assert.equal((await offers.find()).length, 60);
    const all = await offers.find(100);
    assert.equal(all.length, 63);
    assert.ok(all.every((item, i) => !i || all[i - 1].postDate >= item.postDate));
  });

  it('отклоняет некорректный лимит предложений', async () => {
    for (const limit of [0, -1, 1.5]) {
      await assert.rejects(offers.find(limit), /положительным целым/);
    }
  });

  it('возвращает не больше трёх премиальных предложений выбранного города', async () => {
    await container.get(Component.OfferModel).insertMany(Array.from({ length: 5 }, (_, i) => ({
      ...offerInput(user._id), postDate: new Date(2026, 0, i + 1), isPremium: i !== 4
    })));
    const premium = await offers.findPremiumByCity('Paris');
    assert.equal(premium.length, 3);
    assert.ok(premium.every((offer) => offer.isPremium && offer.city.name === 'Paris'));
    assert.equal(premium[0].postDate.getTime(), new Date(2026, 0, 4).getTime());
    assert.equal((await offers.findPremiumByCity('Hamburg')).length, 0);
  });

  it('удаляет предложение вместе с комментариями и ссылками избранного', async () => {
    const offer = await offers.create(offerInput(user._id));
    await createComments(offer, [4]);
    await users.addToFavorites(user.id, offer.id);
    assert.ok(await offers.deleteById(offer.id));
    assert.equal(await offers.findById(offer.id), null);
    assert.equal(await container.get(Component.CommentModel).countDocuments({ offer: offer._id }), 0);
    assert.equal((await users.findById(user.id)).favorites.length, 0);
  });

  it('повторяет очистку связей уже отсутствующего предложения', async () => {
    const offerId = new Types.ObjectId();
    await container.get(Component.CommentModel).create({ text: 'Оставшийся комментарий', rating: 4, author: user._id, offer: offerId });
    await container.get(Component.UserModel).updateOne({ _id: user._id }, { $addToSet: { favorites: offerId } });
    assert.equal(await offers.deleteById(offerId.toString()), null);
    assert.equal(await container.get(Component.CommentModel).countDocuments({ offer: offerId }), 0);
    assert.equal((await users.findById(user.id)).favorites.length, 0);
  });
});
