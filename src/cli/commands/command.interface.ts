export interface Command {
  getName(): string;
  execute(...parameters: string[]): void | Promise<void>;
}
