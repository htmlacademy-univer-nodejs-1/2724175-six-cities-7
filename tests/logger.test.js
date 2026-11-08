import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const loggerUrl = new URL('../dist/shared/libs/logger/pino-logger.js', import.meta.url).href;

test('логер поддерживает уровни, структурированные данные, стек ошибки и скрытие секретов', () => {
  const script = `
    import 'reflect-metadata';
    import { PinoLogger } from ${JSON.stringify(loggerUrl)};
    const logger = new PinoLogger();
    logger.info('Информация', { port: 3000, salt: 'hidden-salt', password: 'hidden-password' });
    logger.warn('Предупреждение', { count: 2 });
    logger.debug('Отладка');
    logger.error('Ошибка приложения', new Error('Тестовая ошибка'), { operation: 'init' });
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const entries = result.stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(entries.map((entry) => entry.level), [30, 40, 50]);
  assert.equal(entries[0].port, 3000);
  assert.equal(entries[1].count, 2);
  assert.equal(entries[2].operation, 'init');
  assert.equal(entries[2].err.message, 'Тестовая ошибка');
  assert.match(entries[2].err.stack, /Error: Тестовая ошибка/);
  assert.doesNotMatch(result.stdout, /hidden-salt|hidden-password/);
});
