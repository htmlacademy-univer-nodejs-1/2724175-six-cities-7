import { createWriteStream } from 'node:fs';
import { extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import chalk from 'chalk';
import { loadTemplates } from '../../shared/libs/offer-generator/load-templates.js';
import { OfferGenerator } from '../../shared/libs/offer-generator/offer-generator.js';
import { serializeOffer } from '../../shared/libs/offer-generator/serialize-offer.js';
import { Command } from './command.interface.js';

export class GenerateCommand implements Command {
  public getName(): string {
    return '--generate';
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [amount, filePath, url] = parameters;
    const count = Number(amount);
    if (parameters.length !== 3 || !/^\d+$/.test(amount)
      || !Number.isSafeInteger(count) || count < 1 || extname(filePath).toLowerCase() !== '.tsv') {
      throw new Error('Использование: --generate <n> <path.tsv> <url>. Ожидается положительное целое количество.');
    }
    const data = await loadTemplates(url);
    const generator = new OfferGenerator(data.offers);
    function* rows(): Generator<string> {
      for (let index = 0; index < count; index++) {
        yield serializeOffer(generator.generate());
      }
    }
    await pipeline(rows(), createWriteStream(filePath, { encoding: 'utf8', flags: 'wx' }));
    console.info(chalk.green(`Сгенерировано предложений: ${count}. Файл: ${filePath}.`));
  }
}
