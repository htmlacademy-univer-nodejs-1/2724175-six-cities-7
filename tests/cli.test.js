import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { TSVFileReader } from '../dist/shared/libs/file-reader/tsv-file-reader.js';
import { parseOffer } from '../dist/shared/libs/file-reader/parse-offer.js';

const cliPath = fileURLToPath(new URL('../dist/main.cli.js', import.meta.url));
const mockPath = fileURLToPath(new URL('../mocks/offers.tsv', import.meta.url));
const fixture = await readFile(mockPath, 'utf8');
const firstLine = fixture.split('\n')[0];
const run = (args = [], options = {}) => spawnSync(process.execPath, [cliPath, ...args], {
  encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' }, ...options
});

async function temporaryFile(content, callback) {
  const directory = await mkdtemp(join(tmpdir(), 'six-cities-'));
  try {
    const path = join(directory, 'offers with spaces.tsv');
    await writeFile(path, content);
    await callback(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('справка по умолчанию совпадает с --help и перечисляет команды', () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.equal(result.stdout, run(['--help']).stdout);
  for (const command of ['--help', '--version', '--import', '--generate']) {
    assert.ok(result.stdout.includes(command));
  }
});

test('версия читается из package.json даже при запуске из другого каталога', async () => {
  const config = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const result = run(['--version'], { cwd: tmpdir() });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), config.version);
});

test('импорт выводит два предложения без паролей', () => {
  const result = run(['--import', mockPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Прочитано предложений: 2/);
  assert.match(result.stdout, /Музыкальный лофт в Дюссельдорфе/);
  assert.doesNotMatch(result.stdout, /password|demo1234|demo5678/);
});

test('неизвестная команда показывает справку, как в референсах', () => {
  for (const args of [['--unknown'], ['stray'], ['--generate']]) {
    const result = run(args);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, run(['--help']).stdout);
  }
});

test('ошибки аргументов выводятся без изменения кода завершения', () => {
  for (const args of [['--import'], ['--import', 'file.csv'], ['--import', mockPath, 'extra'],
    ['--version', '--help'], ['--help', 'extra'], ['--import', `${mockPath}.missing.tsv`]]) {
    const result = run(args);
    assert.equal(result.status, 0, JSON.stringify(args));
    assert.match(result.stderr, /Ошибка:/);
  }
});

test('reader преобразует значения и не подменяет координаты города координатами жилья', async () => {
  const offers = [];
  for await (const offer of new TSVFileReader(mockPath).read()) {
    offers.push(offer);
  }
  assert.equal(offers.length, 2);
  assert.ok(offers[0].postDate instanceof Date);
  assert.equal(offers[0].isFavorite, false);
  assert.equal(offers[0].price, 180);
  assert.equal(offers[0].images.length, 6);
  assert.equal(offers[0].commentCount, 0);
  assert.equal(offers[1].author.avatar, undefined);
  assert.notDeepEqual(offers[0].city.location, offers[0].location);
});

test('импорт поддерживает BOM, CRLF, пустые строки и путь с пробелами', async () => {
  await temporaryFile(`﻿${fixture.replaceAll('\n', '\r\n')}\r\n`, async (path) => {
    const result = run(['--import', path]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Прочитано предложений: 2/);
  });
});

test('пустой TSV корректно обрабатывается', async () => {
  await temporaryFile('', async (path) => {
    const result = run(['--import', path]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Прочитано предложений: 0/);
  });
});

test('ошибка TSV содержит номер строки', async () => {
  await temporaryFile(`${firstLine}\ninvalid\n`, async (path) => {
    const result = run(['--import', path]);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /Строка 2:.*21 колонка/);
    assert.doesNotMatch(result.stdout, /Прочитано предложений:/);
  });
});

test('парсер отклоняет некорректные значения вместо NaN и приведений типов', () => {
  for (const [index, value] of [[0, 'short'], [2, '2026-02-30'], [3, 'London'],
    [5, 'one.jpg'], [6, 'yes'], [8, '4.95'], [9, 'castle'], [10, '2rooms'],
    [12, 'NaN'], [13, 'Hockey STadium'], [15, 'not-email'], [18, 'admin'], [19, '91']]) {
    const fields = firstLine.split('\t');
    fields[index] = value;
    assert.throws(() => parseOffer(fields.join('\t')), undefined, `column ${index}`);
  }
});