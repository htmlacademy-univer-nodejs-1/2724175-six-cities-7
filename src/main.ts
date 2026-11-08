import 'reflect-metadata';
import { Application } from './app/application.js';
import { Component } from './shared/di/component.js';
import { createContainer } from './shared/di/container.js';
import { Config } from './shared/libs/config/config.interface.js';
import { Logger } from './shared/libs/logger/logger.interface.js';

const container = createContainer();
const logger = container.get<Logger>(Component.Logger);

try {
  const config = container.get<Config>(Component.Config);
  config.init();
  logger.info('Порт приложения', { port: config.get('PORT') });
  container.get<Application>(Component.Application).init();
} catch (error: unknown) {
  logger.error('Не удалось инициализировать приложение.',
    error instanceof Error ? error : new Error('Неизвестная ошибка.'));
  process.exitCode = 1;
}
