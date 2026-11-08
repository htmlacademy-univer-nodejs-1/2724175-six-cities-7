export type AppConfig = {
  PORT: number;
  DB_HOST: string;
  SALT: string;
};

export interface Config {
  init(): void;
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
}
