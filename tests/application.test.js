import 'reflect-metadata';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createContainer } from '../dist/shared/di/container.js';
import { Component } from '../dist/shared/di/component.js';

const main = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const valid = { PORT: '3123', DB_HOST: '127.0.0.1', DB_USER: 'admin', DB_PASSWORD: 'test', SALT: 'test-only-salt' };
const required = ['PORT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'SALT'];

async function withDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'six-cities-config-'));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function run(cwd, variables = {}) {
  const env = { ...process.env };
  for (const key of ['PORT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'SALT']) {
    delete env[key];
  }
  return spawnSync(process.execPath, [main], {
    cwd, env: { ...env, ...variables }, encoding: 'utf8'
  });
}

function logs(result) {
  return result.stdout.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

test('приложение получает обязательные настройки и пишет логи Pino без соли', async () => {
  await withDirectory(async (directory) => {
    const result = run(directory, valid);
    assert.equal(result.status, 0, result.stderr);
    const entries = logs(result);
    assert.deepEqual(entries.map((entry) => entry.msg), [
      'Порт приложения', 'Приложение инициализировано.'
    ]);
    assert.ok(entries.every((entry) => entry.level === 30));
    assert.equal(entries[0].port, 3123);
    assert.doesNotMatch(result.stdout + result.stderr, /test-only-salt/);
  });
});

test('dotenv загружает .env, переменные процесса имеют приоритет', async () => {
  await withDirectory(async (directory) => {
    await writeFile(join(directory, '.env'), 'PORT=4000\nDB_HOST=::1\nDB_USER=admin\nDB_PASSWORD=test\nSALT=env-test-salt\n');
    const fromFile = run(directory);
    assert.equal(fromFile.status, 0, fromFile.stderr);
    assert.equal(logs(fromFile)[0].port, 4000);
    const overridden = run(directory, { PORT: '5000' });
    assert.equal(overridden.status, 0);
    assert.equal(logs(overridden)[0].port, 5000);
  });
});

test('каждая настройка обязательна, неверные значения останавливают запуск', async () => {
  await withDirectory(async (directory) => {
    const cases = [];
    for (const key of required) {
      const variables = { ...valid };
      delete variables[key];
      cases.push(variables);
      cases.push({ ...valid, [key]: '' });
    }
    for (const port of ['0', '65536', '3.5', '3000abc', '-1']) {
      cases.push({ ...valid, PORT: port });
    }
    for (const host of ['localhost', '999.1.1.1', 'https://example.com']) {
      cases.push({ ...valid, DB_HOST: host });
    }
    cases.push({ ...valid, SALT: '   ' });
    for (const variables of cases) {
      const result = run(directory, variables);
      assert.equal(result.status, 1, JSON.stringify(variables));
      assert.equal(logs(result)[0].level, 50);
      assert.match(logs(result)[0].err.message, /Некорректная конфигурация/);
      assert.match(logs(result)[0].err.stack, /Error:/);
      assert.doesNotMatch(result.stdout, /Приложение инициализировано|test-only-salt/);
    }
  });
});

test('контейнер внедряет логер и хранит singleton-компоненты', () => {
  const container = createContainer();
  const messages = [];
  const logger = { info: (message) => messages.push(message), error: () => {} };
  container.rebind(Component.Logger).toConstantValue(logger);
  const application = container.get(Component.Application);
  assert.equal(application, container.get(Component.Application));
  assert.equal(container.get(Component.Config), container.get(Component.Config));
  application.init();
  assert.deepEqual(messages, ['Приложение инициализировано.']);
  assert.throws(() => container.get(Component.Config).get('PORT'), /не инициализирована/);
});
