import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Offer } from '../../types/index.js';
import { parseOffer } from './parse-offer.js';

export class TSVFileReader {
  constructor(private readonly filePath: string) {}

  public async *read(): AsyncGenerator<Offer> {
    const stream = createReadStream(this.filePath, { encoding: 'utf8' });
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    let lineNumber = 0;

    try {
      for await (const line of lines) {
        lineNumber++;
        if (!line.trim()) {
          continue;
        }
        try {
          yield parseOffer(lineNumber === 1 && line.charCodeAt(0) === 0xFEFF ? line.slice(1) : line);
        } catch (error) {
          throw new Error(`Строка ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      lines.close();
      stream.destroy();
    }
  }
}
