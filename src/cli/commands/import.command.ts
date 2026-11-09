import { extname } from 'node:path';
import { config as loadEnv } from 'dotenv';
import chalk from 'chalk';
import { Types } from 'mongoose';
import { inject, injectable } from 'inversify';
import { CLIComponent } from '../cli-component.js';
import { ReaderFactory } from '../cli-dependencies.js';
import { Component } from '../../shared/di/component.js';
import { DatabaseClient } from '../../shared/libs/database-client/database-client.interface.js';
import { UserService } from '../../shared/modules/user/user-service.interface.js';
import { OfferService } from '../../shared/modules/offer/offer-service.interface.js';
import { Command } from './command.interface.js';

@injectable()
export class ImportCommand implements Command {
  constructor(
    @inject(CLIComponent.ReaderFactory) private readonly createReader: ReaderFactory,
    @inject(Component.DatabaseClient) private readonly database: DatabaseClient,
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.OfferService) private readonly offers: OfferService
  ) {}

  public getName(): string {
    return '--import';
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filePath, uri] = parameters;
    if (parameters.length !== 2 || !filePath.trim() || extname(filePath).toLowerCase() !== '.tsv'
      || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
      throw new Error('Использование: --import <path.tsv> <mongodb-uri>.');
    }
    loadEnv();
    const salt = process.env.SALT;
    if (!salt?.trim()) {
      throw new Error('Для импорта требуется переменная SALT.');
    }
    let count = 0;
    try {
      await this.database.connect(uri);
      for await (const offer of this.createReader(filePath).read()) {
        let author = await this.users.findByEmail(offer.author.email);
        if (!author) {
          author = await this.users.create(offer.author, salt);
        }
        await this.offers.create({ ...offer, author: new Types.ObjectId(author._id) });
        count++;
      }
      console.info(chalk.green(`Импортировано предложений: ${count}.`));
    } finally {
      await this.database.disconnect();
    }
  }
}
