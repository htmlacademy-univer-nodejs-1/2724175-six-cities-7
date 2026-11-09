export type AppConfig = {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  SALT: string;
};

export interface Config {
  init(): void;
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
}
