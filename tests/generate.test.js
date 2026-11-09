import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { OfferGenerator } from '../dist/shared/libs/offer-generator/offer-generator.js';
import { serializeOffer } from '../dist/shared/libs/offer-generator/serialize-offer.js';
import { parseOffer } from '../dist/shared/libs/file-reader/parse-offer.js';

const cli = fileURLToPath(new URL('../dist/main.cli.js', import.meta.url));
const templates = JSON.parse(await readFile(new URL('../mocks/mock-server-data.json', import.meta.url), 'utf8')).api;

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, FORCE_COLOR: '0' } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function setup(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'six-cities-generate-'));
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/error') {
      response.writeHead(500).end('{}');
    } else {
      response.end(JSON.stringify(request.url === '/invalid' ? { offers: [{}] } : templates));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await callback(join(directory, 'offers with spaces.tsv'), `http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}

test('все шесть заготовок генерируют предложения, совместимые с импортом', () => {
  assert.equal(templates.offers.length, 6);
  for (const template of templates.offers) {
    const generator = new OfferGenerator([template]);
    for (let index = 0; index < 20; index++) {
      const offer = generator.generate();
      assert.deepEqual(parseOffer(serializeOffer(offer).trimEnd()), offer);
    }
  }
});

test('генерация получает данные по HTTP, сохраняет нужное количество и допускает импорт', async () => {
  await setup(async (path, url) => {
    const generated = await run(['--generate', '100', path, url]);
    assert.equal(generated.status, 0);
    assert.equal(generated.stderr, '');
    assert.match(generated.stdout, /Сгенерировано предложений: 100/);
    const rows = (await readFile(path, 'utf8')).trimEnd().split('\n');
    assert.equal(rows.length, 100);
    rows.forEach((row) => parseOffer(row));
  });
});

test('генерация не перезаписывает существующий файл', async () => {
  await setup(async (path, url) => {
    await writeFile(path, 'original');
    const result = await run(['--generate', '1', path, url]);
    assert.match(result.stderr, /Ошибка:/);
    assert.equal(await readFile(path, 'utf8'), 'original');
  });
});

test('ошибочные аргументы, HTTP и заготовки не приводят к сообщению об успехе', async () => {
  await setup(async (path, url) => {
    for (const args of [[], ['0', path, url], ['-1', path, url], ['1.5', path, url],
      ['9007199254740992', path, url], ['1', `${path}.csv`, url],
      ['1', path, 'file:///tmp/data'], ['1', path, `${url}/invalid`], ['1', path, `${url}/error`]]) {
      const result = await run(['--generate', ...args]);
      assert.match(result.stderr, /Ошибка:/, JSON.stringify(args));
      assert.doesNotMatch(result.stdout, /Сгенерировано предложений:/);
    }
  });
});

test('ошибка записи обрабатывается без сообщения об успехе', async () => {
  await setup(async (path, url) => {
    const result = await run(['--generate', '1', join(path, 'missing.tsv'), url]);
    assert.match(result.stderr, /Ошибка:/);
    assert.doesNotMatch(result.stdout, /Сгенерировано предложений:/);
  });
});
