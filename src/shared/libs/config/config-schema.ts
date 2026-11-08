import convict from 'convict';
import { AppConfig } from './config.interface.js';

export const configSchema: convict.Schema<AppConfig> = {
  PORT: {
    doc: 'Порт приложения',
    format: 'app-port',
    default: null,
    env: 'PORT'
  },
  DB_HOST: {
    doc: 'IP-адрес сервера базы данных',
    format: 'ipaddress',
    default: null,
    env: 'DB_HOST'
  },
  SALT: {
    doc: 'Соль для хеширования',
    format: (value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Ожидается непустая строка.');
      }
    },
    default: null,
    env: 'SALT',
    sensitive: true
  }
};
