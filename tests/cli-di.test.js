import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCLIContainer } from '../dist/cli/cli-container.js';
import { CLIApplication } from '../dist/cli/cli-application.js';
import { CLIComponent } from '../dist/cli/cli-component.js';

test('контейнер CLI регистрирует четыре команды и внедряет фабрики', () => {
  const container = createCLIContainer();
  assert.deepEqual(container.getAll(CLIComponent.Command).map((command) => command.getName()),
    ['--help', '--version', '--import', '--generate']);
  assert.equal(container.get(CLIApplication), container.get(CLIApplication));
  assert.equal(typeof container.get(CLIComponent.ReaderFactory), 'function');
  assert.equal(typeof container.get(CLIComponent.GeneratorFactory), 'function');
});

test('CLI получает список команд через DI и ожидает выполнение команды', async () => {
  const container = createCLIContainer();
  const received = [];
  container.unbind(CLIComponent.Command);
  container.bind(CLIComponent.Command).toConstantValue({
    getName: () => '--test',
    execute: async (...args) => { await Promise.resolve(); received.push(...args); }
  });
  await container.get(CLIApplication).processCommand(['--test', 'argument']);
  assert.deepEqual(received, ['argument']);
});

test('команда импорта получает заменяемую фабрику reader из контейнера', async () => {
  const container = createCLIContainer();
  container.rebind(CLIComponent.ReaderFactory).toConstantValue((path) => {
    assert.equal(path, 'input.tsv');
    return { async *read() { throw new Error('reader injected'); } };
  });
  await assert.rejects(container.get(CLIApplication).processCommand(['--import', 'input.tsv']), /reader injected/);
});

test('команда генерации получает заменяемый загрузчик из контейнера', async () => {
  const container = createCLIContainer();
  container.rebind(CLIComponent.LoadTemplates).toConstantValue(async (url) => {
    assert.equal(url, 'http://example.com/api');
    throw new Error('loader injected');
  });
  await assert.rejects(container.get(CLIApplication).processCommand([
    '--generate', '1', 'output.tsv', 'http://example.com/api'
  ]), /loader injected/);
});
