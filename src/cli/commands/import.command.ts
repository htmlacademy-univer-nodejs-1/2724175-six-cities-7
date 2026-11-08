import { once } from 'node:events';
import { extname } from 'node:path';
import chalk from 'chalk';
import { TSVFileReader } from '../../shared/libs/file-reader/tsv-file-reader.js';
import { Command } from './command.interface.js';

export class ImportCommand implements Command {
  public getName(): string {
    return '--import';
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filePath] = parameters;
    if (parameters.length !== 1 || !filePath.trim() || extname(filePath).toLowerCase() !== '.tsv') {
      throw new Error('Использование: --import <path.tsv>. Ожидается один путь к TSV-файлу.');
    }

    let count = 0;
    for await (const offer of new TSVFileReader(filePath).read()) {
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
