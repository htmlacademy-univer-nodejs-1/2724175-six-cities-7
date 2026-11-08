import { injectable } from 'inversify';
import pino from 'pino';
import { LogData, Logger } from './logger.interface.js';

@injectable()
export class PinoLogger implements Logger {
  private readonly logger = pino({
    redact: ['SALT', 'salt', 'password']
  });

  public info(message: string, data: LogData = {}): void {
    this.logger.info(data, message);
  }

  public warn(message: string, data: LogData = {}): void {
    this.logger.warn(data, message);
  }

  public debug(message: string, data: LogData = {}): void {
    this.logger.debug(data, message);
  }

  public error(message: string, error?: Error, data: LogData = {}): void {
    this.logger.error({ ...data, ...(error ? { err: error } : {}) }, message);
  }
}
