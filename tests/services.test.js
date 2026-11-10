import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Container } from 'inversify';
import { Types } from 'mongoose';
import { registerDatabase } from '../dist/shared/di/database-container.js';
import { Component } from '../dist/shared/di/component.js';
import { CITY_LOCATIONS } from '../dist/shared/types/index.js';

const uri = process.env.MONGO_TEST_URI;

test('сервисы: CRUD, списки, избранное, комментарии и точный рейтинг в MongoDB', { skip: !uri }, async () => {
  const container = new Container();
  container.bind(Component.Logger).toConstantValue({ info() {}, error() {} });
  registerDatabase(container);
  const connection = container.get(Component.DatabaseConnection);
  const dbName = `six-cities-services-test-${new Types.ObjectId()}`;
  try {
    await connection.openUri(uri, { dbName });
    const users = container.get(Component.UserService);
    const offers = container.get(Component.OfferService);
    const comments = container.get(Component.CommentService);
    const offerModel = container.get(Component.OfferModel);
    const commentModel = container.get(Component.CommentModel);
    const user = await users.create({ name: 'Тест', email: 'test@example.com', password: 'demo1234', type: 'pro' }, 'test-only-salt');
    const other = await users.create({ name: 'Гость', email: 'guest@example.com', password: 'demo1234', type: 'обычный' }, 'test-only-salt');
    assert.equal((await users.findByEmail(user.email)).id, user.id);
    assert.equal((await users.updateById(user.id, { avatar: 'avatar.png' })).avatar, 'avatar.png');
    assert.equal((await users.findById(user.id)).name, 'Тест');
    const input = {
      title: 'Тестовая квартира', description: 'Описание тестового предложения для проверки сервисов.',
      city: { name: 'Paris', location: CITY_LOCATIONS.Paris },
      previewImage: 'https://example.com/preview.jpg',
      images: Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.jpg`),
      isPremium: true, housingType: 'apartment', roomsCount: 2, guestsCount: 3,
      price: 150, amenities: ['Washer'], location: CITY_LOCATIONS.Paris, author: user._id
    };
    const offer = await offers.create({ ...input, rating: 5, commentCount: 99 });
    assert.equal(offer.commentCount, 0);
    assert.equal(offer.rating, 0);
    assert.equal(await offers.exists(offer.id), true);
    assert.equal(await offers.isAuthor(offer.id, user.id), true);
    assert.equal(await offers.isAuthor(offer.id, other.id), false);
    assert.equal((await offers.findById(offer.id)).author.password, undefined);
    await offers.updateById(offer.id, { price: 250, author: other._id, commentCount: 99 });
    const updated = await offers.findById(offer.id);
    assert.equal(updated.price, 250);
    assert.equal(updated.title, input.title);
    assert.equal(updated.author.id, user.id);
    assert.equal(updated.commentCount, 0);
    await users.addToFavorites(user.id, offer.id);
    await users.addToFavorites(user.id, offer.id);
    assert.equal((await offers.findFavorites(user.id)).length, 1);
    assert.equal((await offers.findFavorites(other.id)).length, 0);
    await users.removeFromFavorites(user.id, offer.id);
    assert.equal((await offers.findFavorites(user.id)).length, 0);
    await users.addToFavorites(user.id, offer.id);
    const ratings = [1, 2, 2, 5, 3, 4, 1];
    for (const rating of ratings) {
      const comment = await comments.create({ text: 'Тестовый комментарий', rating, author: other._id, offer: offer._id });
      assert.equal(comment.author.password, undefined);
    }
    let aggregate = await offers.findById(offer.id);
    assert.equal(aggregate.commentCount, ratings.length);
    assert.equal(aggregate.rating, Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10);
    const parallel = Array.from({ length: 50 }, (_, i) => i % 5 + 1);
    await Promise.all(parallel.map((rating) => comments.create({ text: 'Параллельный комментарий', rating, author: other._id, offer: offer._id })));
    aggregate = await offers.findById(offer.id);
    assert.equal(aggregate.commentCount, 57);
    const sum = [...ratings, ...parallel].reduce((a, b) => a + b, 0);
    assert.equal(aggregate.ratingSum, sum);
    assert.equal(aggregate.rating, Math.round(sum / 57 * 10) / 10);
    const recent = await comments.findByOfferId(offer.id);
    assert.equal(recent.length, 50);
    assert.ok(recent.every((comment, i) => !i || recent[i - 1].postDate >= comment.postDate));
    const missingId = new Types.ObjectId();
    await assert.rejects(comments.create({ text: 'Нет предложения', rating: 5, author: user._id, offer: missingId }), /не найдено/);
    assert.equal(await commentModel.countDocuments({ offer: missingId }), 0);
    await assert.rejects(users.addToFavorites(user.id, missingId.toString()), /не найдено/);
    for (let i = 0; i < 62; i++) {
      await offers.create({ ...input, postDate: new Date(2026, 0, i + 1) });
    }
    await assert.rejects(offers.find(0), /положительным целым/);
    await assert.rejects(offers.find(-1), /положительным целым/);
    await assert.rejects(offers.find(1.5), /положительным целым/);
    assert.equal((await offers.find()).length, 60);
    const all = await offers.find(100);
    assert.equal(all.length, 63);
    assert.ok(all.every((item, i) => !i || all[i - 1].postDate >= item.postDate));
    assert.equal((await offers.findPremiumByCity('Paris')).length, 3);
    assert.equal((await offers.findPremiumByCity('Hamburg')).length, 0);
    assert.ok(await offers.deleteById(offer.id));
    assert.equal(await offerModel.countDocuments({ _id: offer._id }), 0);
    assert.equal(await commentModel.countDocuments({ offer: offer._id }), 0);
    assert.equal((await users.findById(user.id)).favorites.length, 0);
    await commentModel.create({ text: 'Оставшийся комментарий', rating: 4, author: user._id, offer: offer._id });
    await container.get(Component.UserModel).updateOne({ _id: user._id }, { $addToSet: { favorites: offer._id } });
    assert.equal(await offers.deleteById(offer.id), null);
    assert.equal(await commentModel.countDocuments({ offer: offer._id }), 0);
    assert.equal((await users.findById(user.id)).favorites.length, 0);
  } finally {
    if (connection.readyState === 1 && connection.name === dbName) await connection.dropDatabase();
    await connection.close();
  }
});
