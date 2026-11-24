import 'reflect-metadata';
import { Container } from 'inversify';
import { Application } from '../../app/application.js';
import { Config } from '../libs/config/config.interface.js';
import { ConvictConfig } from '../libs/config/convict-config.js';
import { Logger } from '../libs/logger/logger.interface.js';
import { PinoLogger } from '../libs/logger/pino-logger.js';
import { Component } from './component.js';
import { registerDatabase } from './database-container.js';

export function createContainer(): Container {
  const container = new Container();
  container.bind<Logger>(Component.Logger).to(PinoLogger).inSingletonScope();
  container.bind<Config>(Component.Config).to(ConvictConfig).inSingletonScope();
  container.bind<Application>(Component.Application).to(Application).inSingletonScope();
  registerDatabase(container);
  return container;
}
