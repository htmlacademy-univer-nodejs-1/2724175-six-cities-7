export class OfferNotFoundError extends Error {
  constructor() {
    super('Предложение не найдено.');
  }
}
