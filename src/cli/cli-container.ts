import 'reflect-metadata';
import { Container } from 'inversify';
import { TSVFileReader } from '../shared/libs/file-reader/tsv-file-reader.js';
import { OfferGenerator } from '../shared/libs/offer-generator/offer-generator.js';
import { loadTemplates } from '../shared/libs/offer-generator/load-templates.js';
import { serializeOffer } from '../shared/libs/offer-generator/serialize-offer.js';
import { CLIApplication } from './cli-application.js';
import { CLIComponent } from './cli-component.js';
import { GeneratorFactory, OfferSerializer, ReaderFactory, TemplateLoader } from './cli-dependencies.js';
import { Command } from './commands/command.interface.js';
import { GenerateCommand } from './commands/generate.command.js';
import { HelpCommand } from './commands/help.command.js';
import { ImportCommand } from './commands/import.command.js';
import { VersionCommand } from './commands/version.command.js';

export function createCLIContainer(): Container {
  const container = new Container();
  container.bind(CLIApplication).toSelf().inSingletonScope();
  container.bind<Command>(CLIComponent.Command).to(HelpCommand);
  container.bind<Command>(CLIComponent.Command).to(VersionCommand);
  container.bind<Command>(CLIComponent.Command).to(ImportCommand);
  container.bind<Command>(CLIComponent.Command).to(GenerateCommand);
  container.bind<ReaderFactory>(CLIComponent.ReaderFactory).toConstantValue((path) => new TSVFileReader(path));
  container.bind<GeneratorFactory>(CLIComponent.GeneratorFactory).toConstantValue((templates) => new OfferGenerator(templates));
  container.bind<TemplateLoader>(CLIComponent.LoadTemplates).toConstantValue(loadTemplates);
  container.bind<OfferSerializer>(CLIComponent.SerializeOffer).toConstantValue(serializeOffer);
  return container;
}
