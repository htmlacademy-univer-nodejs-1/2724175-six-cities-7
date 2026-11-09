import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCLIContainer } from '../dist/cli/cli-container.js';
import { CLIApplication } from '../dist/cli/cli-application.js';
import { CLIComponent } from '../dist/cli/cli-component.js';
import { Component } from '../dist/shared/di/component.js';
import { MongoClient } from '../dist/shared/libs/database-client/mongo-client.js';
import { DefaultUserService } from '../dist/shared/modules/user/default-user.service.js';
import { getModelForClass } from '@typegoose/typegoose';
import { UserEntity } from '../dist/shared/modules/user/user.model.js';
import { OfferEntity } from '../dist/shared/modules/offer/offer.model.js';

const logger = { info() {}, error() {} };
const UserModel = getModelForClass(UserEntity);
const OfferModel = getModelForClass(OfferEntity);

test('схемы включают timestamps, уникальный email и ссылку на автора', () => {
  assert.equal(UserModel.schema.options.timestamps, true);
  assert.equal(OfferModel.schema.options.timestamps, true);
  assert.equal(UserModel.schema.path('email').options.unique, true);
  assert.equal(OfferModel.schema.path('author').options.ref, 'UserEntity');
});

test('сервис хеширует пароль до передачи модели', async () => {
  let saved;
  const service = new DefaultUserService({
    init: async () => {},
    create: async (value) => { saved = value; return value; }
  }, logger);
  await service.create({ name: 'User', email: 'user@example.com', password: 'demo1234', type: 'pro' }, 'salt');
  assert.notEqual(saved.password, 'demo1234');
  assert.match(saved.password, /^[0-9a-f]{128}$/);
});

test('ошибка соединения не раскрывает URI и закрывает клиент', async () => {
  let closed = false;
  const client = new MongoClient({
    openUri: async () => { throw new Error('mongodb://user:secret@localhost'); },
    close: async () => { closed = true; }
  }, logger);
  await assert.rejects(client.connect('mongodb://user:secret@localhost'), (error) => {
    assert.doesNotMatch(error.message, /secret/);
    return true;
  });
  assert.equal(closed, true);
});

test('ошибка сохранения останавливает импорт и закрывает соединение', async () => {
  const container = createCLIContainer();
  let disconnected = false;
  const previousSalt = process.env.SALT;
  process.env.SALT = 'test-only-salt';
  container.rebind(Component.DatabaseClient).toConstantValue({
    connect: async () => {},
    disconnect: async () => { disconnected = true; }
  });
  container.rebind(Component.UserService).toConstantValue({ findByEmail: async () => ({ _id: '507f1f77bcf86cd799439011' }) });
  container.rebind(Component.OfferService).toConstantValue({ create: async () => { throw new Error('write failed'); } });
  container.rebind(CLIComponent.ReaderFactory).toConstantValue(() => ({
    async *read() { yield { author: { email: 'user@example.com' } }; }
  }));
  try {
    await assert.rejects(container.get(CLIApplication).processCommand([
      '--import', 'input.tsv', 'mongodb://localhost/test'
    ]), /write failed/);
    assert.equal(disconnected, true);
  } finally {
    if (previousSalt === undefined) delete process.env.SALT;
    else process.env.SALT = previousSalt;
  }
});
