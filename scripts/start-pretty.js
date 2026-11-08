import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import pretty from 'pino-pretty';

const application = spawn(process.execPath, [fileURLToPath(new URL('../dist/main.js', import.meta.url))], {
  stdio: ['inherit', 'pipe', 'inherit']
});

const completion = new Promise((resolve, reject) => {
  application.once('error', reject);
  application.once('close', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
});

try {
  const [, code] = await Promise.all([
    pipeline(application.stdout, pretty(), process.stdout),
    completion
  ]);
  process.exitCode = code;
} catch (error) {
  application.kill();
  console.error(error instanceof Error ? error.message : 'Ошибка форматирования логов.');
  process.exitCode = 1;
}
