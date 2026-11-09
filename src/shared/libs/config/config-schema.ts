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
  DB_PORT: {
    doc: 'Порт сервера базы данных',
    format: 'app-port',
    default: 27017,
    env: 'DB_PORT'
  },
  DB_USER: {
    doc: 'Пользователь базы данных',
    format: (value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Ожидается непустая строка.');
      }
    },
    default: null,
    env: 'DB_USER'
  },
  DB_PASSWORD: {
    doc: 'Пароль базы данных',
    format: (value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Ожидается непустая строка.');
      }
    },
    default: null,
    env: 'DB_PASSWORD',
    sensitive: true
  },
  DB_NAME: {
    doc: 'Имя базы данных',
    format: String,
    default: 'six-cities',
    env: 'DB_NAME'
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
