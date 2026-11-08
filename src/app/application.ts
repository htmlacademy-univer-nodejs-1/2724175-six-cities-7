import { inject, injectable } from 'inversify';
import { Component } from '../shared/di/component.js';
import { Logger } from '../shared/libs/logger/logger.interface.js';

@injectable()
export class Application {
  constructor(@inject(Component.Logger) private readonly logger: Logger) {}

  public init(): void {
    this.logger.info('Приложение инициализировано.');
  }
}
