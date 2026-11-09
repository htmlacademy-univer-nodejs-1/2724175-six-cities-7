import { setTimeout } from 'node:timers/promises';
import { inject, injectable } from 'inversify';
import { Connection } from 'mongoose';
import { Component } from '../../di/component.js';
import { Logger } from '../logger/logger.interface.js';
import { DatabaseClient } from './database-client.interface.js';

const RETRY_COUNT = 5;
const RETRY_TIMEOUT = 1000;

type MongooseConnection = Connection;

@injectable()
export class MongoClient implements DatabaseClient {
  constructor(
    @inject(Component.DatabaseConnection) private readonly connection: MongooseConnection,
    @inject(Component.Logger) private readonly logger: Logger
  ) {}

  public async connect(uri: string): Promise<void> {
    if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
      throw new Error('Ожидается URI подключения MongoDB.');
    }
    this.logger.info('Подключение к MongoDB.');
    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        await this.connection.openUri(uri, { serverSelectionTimeoutMS: 5000 });
        this.logger.info('Соединение с MongoDB установлено.');
        return;
      } catch (error: unknown) {
        const reason = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Не удалось подключиться к MongoDB. Попытка ${attempt} из ${RETRY_COUNT}.`,
          new Error(reason.message));
        if (attempt < RETRY_COUNT) {
          await setTimeout(RETRY_TIMEOUT);
        }
      }
    }
    await this.connection.close().catch(() => undefined);
    this.logger.error('Не удалось подключиться к MongoDB.');
    throw new Error(`Не удалось подключиться к MongoDB после ${RETRY_COUNT} попыток.`);
  }

  public async disconnect(): Promise<void> {
    await this.connection.close();
    this.logger.info('Соединение с MongoDB закрыто.');
  }
}
