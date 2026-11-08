import { randomInt } from 'node:crypto';

export function randomNumber(min: number, max: number): number {
  return randomInt(min, max + 1);
}

export function randomItem<T>(items: readonly T[]): T {
  if (!items.length) {
    throw new Error('Массив для случайного выбора пуст.');
  }
  return items[randomNumber(0, items.length - 1)];
}

export function randomItems<T>(items: readonly T[]): T[] {
  const selected = items.filter(() => randomNumber(0, 1) === 1);
  return selected.length ? selected : [randomItem(items)];
}
