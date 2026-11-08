import { injectable, multiInject } from 'inversify';
import { CLIComponent } from './cli-component.js';
import { Command } from './commands/command.interface.js';

@injectable()
export class CLIApplication {
  private readonly commands = new Map<string, Command>();

  constructor(@multiInject(CLIComponent.Command) commands: Command[]) {
    this.registerCommands(commands);
  }

  public registerCommands(commands: Command[]): void {
    for (const command of commands) {
      const name = command.getName();
      if (this.commands.has(name)) {
        throw new Error(`Команда ${name} уже зарегистрирована.`);
      }
      this.commands.set(name, command);
    }
  }

  public async processCommand(argv: string[]): Promise<void> {
    const [name = '--help', ...parameters] = argv;
    const command = this.commands.get(name) ?? this.commands.get('--help');
    if (!command) {
      throw new Error('Команда по умолчанию --help не зарегистрирована.');
    }
    await command.execute(...parameters);
  }
}
