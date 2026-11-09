import { Container } from 'inversify';
import { getModelForClass } from '@typegoose/typegoose';
import { createConnection } from 'mongoose';
import { Component } from './component.js';
import { DatabaseClient } from '../libs/database-client/database-client.interface.js';
import { MongoClient } from '../libs/database-client/mongo-client.js';
import { UserEntity } from '../modules/user/user.model.js';
import { OfferEntity } from '../modules/offer/offer.model.js';
import { DefaultUserService } from '../modules/user/default-user.service.js';
import { DefaultOfferService } from '../modules/offer/default-offer.service.js';
import { UserService } from '../modules/user/user-service.interface.js';
import { OfferService } from '../modules/offer/offer-service.interface.js';

export function registerDatabase(container: Container): void {
  container.bind(Component.DatabaseConnection).toDynamicValue(() => createConnection()).inSingletonScope();
  container.bind<DatabaseClient>(Component.DatabaseClient).to(MongoClient).inSingletonScope();
  container.bind(Component.UserModel).toDynamicValue(({ container: scope }) =>
    getModelForClass(UserEntity, { existingConnection: scope.get(Component.DatabaseConnection), options: { disableCaching: true } })).inSingletonScope();
  container.bind(Component.OfferModel).toDynamicValue(({ container: scope }) =>
    getModelForClass(OfferEntity, { existingConnection: scope.get(Component.DatabaseConnection), options: { disableCaching: true } })).inSingletonScope();
  container.bind<UserService>(Component.UserService).to(DefaultUserService).inSingletonScope();
  container.bind<OfferService>(Component.OfferService).to(DefaultOfferService).inSingletonScope();
}
