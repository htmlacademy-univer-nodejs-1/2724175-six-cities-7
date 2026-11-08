#!/usr/bin/env node

import 'reflect-metadata';
import chalk from 'chalk';
import { CLIApplication } from './cli/cli-application.js';
import { createCLIContainer } from './cli/cli-container.js';

const application = createCLIContainer().get(CLIApplication);

application.processCommand(process.argv.slice(2)).catch((error: unknown) => {
  console.error(chalk.red(`Ошибка: ${error instanceof Error ? error.message : String(error)}`));
});
