import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/start-pretty.js', import.meta.url));

test('форматирование логов сохраняет успешный и ошибочный коды приложения', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'six-cities-pretty-'));
  try {
    const env = { ...process.env };
    for (const key of ['PORT', 'DB_HOST', 'SALT']) {
      delete env[key];
    }
    const failed = spawnSync(process.execPath, [script], { cwd: directory, env, encoding: 'utf8' });
    assert.equal(failed.status, 1, failed.stderr);
    assert.match(failed.stdout, /ERROR.*Не удалось инициализировать приложение/);
    assert.match(failed.stdout, /Некорректная конфигурация/);

    const success = spawnSync(process.execPath, [script], {
      cwd: directory,
      env: { ...env, PORT: '3000', DB_HOST: '127.0.0.1', SALT: 'pretty-test-only' },
      encoding: 'utf8'
    });
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /INFO.*Приложение инициализировано/);
    assert.doesNotMatch(success.stdout, /pretty-test-only/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
