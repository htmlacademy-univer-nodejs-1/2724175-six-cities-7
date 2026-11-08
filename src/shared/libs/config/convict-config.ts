import { injectable } from 'inversify';
import convict from 'convict';
import formats from 'convict-format-with-validator';
import { config as loadEnv } from 'dotenv';
import { AppConfig, Config } from './config.interface.js';
import { configSchema } from './config-schema.js';

convict.addFormats(formats);
convict.addFormat({
  name: 'app-port',
  validate: (value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error('Ожидается целый номер порта от 1 до 65535.');
    }
  },
  coerce: (value: string) => /^\d+$/.test(value) ? Number(value) : NaN
});

@injectable()
export class ConvictConfig implements Config {
  private config?: convict.Config<AppConfig>;

  public init(): void {
    const result = loadEnv();
    if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error('Не удалось прочитать .env.');
    }
    const config = convict(configSchema, { args: [] });
    try {
      config.validate({ allowed: 'strict' });
    } catch {
      throw new Error('Некорректная конфигурация. Обязательны PORT (1–65535), DB_HOST (IP-адрес) и SALT (непустая строка).');
    }
    this.config = config;
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    if (!this.config) {
      throw new Error('Конфигурация не инициализирована.');
    }
    return this.config.getProperties()[key];
  }
}
