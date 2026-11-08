import { createWriteStream } from 'node:fs';
import { extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import chalk from 'chalk';
import { inject, injectable } from 'inversify';
import { CLIComponent } from '../cli-component.js';
import { GeneratorFactory, OfferSerializer, TemplateLoader } from '../cli-dependencies.js';
import { Command } from './command.interface.js';

@injectable()
export class GenerateCommand implements Command {
  constructor(
    @inject(CLIComponent.LoadTemplates) private readonly loadTemplates: TemplateLoader,
    @inject(CLIComponent.GeneratorFactory) private readonly createGenerator: GeneratorFactory,
    @inject(CLIComponent.SerializeOffer) private readonly serialize: OfferSerializer
  ) {}

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
    const data = await this.loadTemplates(url);
    const generator = this.createGenerator(data.offers);
    const serialize = this.serialize;
    function* rows(): Generator<string> {
      for (let index = 0; index < count; index++) {
        yield serialize(generator.generate());
      }
    }
    await pipeline(rows(), createWriteStream(filePath, { encoding: 'utf8', flags: 'wx' }));
    console.info(chalk.green(`Сгенерировано предложений: ${count}. Файл: ${filePath}.`));
  }
}
