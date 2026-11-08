#!/usr/bin/env node

import chalk from 'chalk';
import { CLIApplication } from './cli/cli-application.js';
import { GenerateCommand } from './cli/commands/generate.command.js';
import { HelpCommand } from './cli/commands/help.command.js';
import { ImportCommand } from './cli/commands/import.command.js';
import { VersionCommand } from './cli/commands/version.command.js';

const application = new CLIApplication();
application.registerCommands([new HelpCommand(), new VersionCommand(), new ImportCommand(), new GenerateCommand()]);

application.processCommand(process.argv.slice(2)).catch((error: unknown) => {
  console.error(chalk.red(`Ошибка: ${error instanceof Error ? error.message : String(error)}`));
});
