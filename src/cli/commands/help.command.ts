import chalk from 'chalk';
import { Command } from './command.interface.js';

export class HelpCommand implements Command {
  public getName(): string {
    return '--help';
  }

  public execute(...parameters: string[]): void {
    if (parameters.length) {
      throw new Error('Команда --help не принимает аргументы.');
    }
    console.info(`
${chalk.bold.cyan('Шесть городов — подготовка данных для REST API сервера')}

Пример: npm run cli -- <команда> [аргументы]

${chalk.bold('Команды:')}
  ${chalk.green('--help')}                       печатает эту справку
  ${chalk.green('--version')}                    выводит версию приложения
  ${chalk.green('--import <path>')}              читает TSV и выводит предложения в консоль
  ${chalk.yellow('--generate <n> <path> <url>')}  генерирует тестовые данные
`);
  }
}
