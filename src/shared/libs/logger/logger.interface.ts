export type LogData = Record<string, unknown>;

export interface Logger {
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  debug(message: string, data?: LogData): void;
  error(message: string, error?: Error, data?: LogData): void;
}
