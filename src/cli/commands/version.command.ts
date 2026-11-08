import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import { injectable } from 'inversify';
import { Command } from './command.interface.js';

@injectable()
export class VersionCommand implements Command {
  public getName(): string {
    return '--version';
  }

  public async execute(...parameters: string[]): Promise<void> {
    if (parameters.length) {
      throw new Error('Команда --version не принимает аргументы.');
    }
    const packagePath = new URL('../../../package.json', import.meta.url);
    const config: unknown = JSON.parse(await readFile(packagePath, 'utf8'));
    if (typeof config !== 'object' || config === null || !('version' in config)
      || typeof config.version !== 'string' || !config.version.trim()) {
      throw new Error('В package.json отсутствует строковое поле version.');
    }
    console.info(chalk.green(config.version));
  }
}
