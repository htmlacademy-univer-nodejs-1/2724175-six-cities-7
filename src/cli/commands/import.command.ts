import { once } from 'node:events';
import { extname } from 'node:path';
import chalk from 'chalk';
import { inject, injectable } from 'inversify';
import { CLIComponent } from '../cli-component.js';
import { ReaderFactory } from '../cli-dependencies.js';
import { Command } from './command.interface.js';

@injectable()
export class ImportCommand implements Command {
  constructor(@inject(CLIComponent.ReaderFactory) private readonly createReader: ReaderFactory) {}

  public getName(): string {
    return '--import';
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filePath] = parameters;
    if (parameters.length !== 1 || !filePath.trim() || extname(filePath).toLowerCase() !== '.tsv') {
      throw new Error('Использование: --import <path.tsv>. Ожидается один путь к TSV-файлу.');
    }

    let count = 0;
    for await (const offer of this.createReader(filePath).read()) {
      const { name, email, avatar, type } = offer.author;
      const author = { name, email, avatar, type };
      const output = chalk.cyan(JSON.stringify({ ...offer, author }));
      if (!process.stdout.write(`${output}\n`)) {
        await once(process.stdout, 'drain');
      }
      count++;
    }
    console.info(chalk.green(`Прочитано предложений: ${count}.`));
  }
}
