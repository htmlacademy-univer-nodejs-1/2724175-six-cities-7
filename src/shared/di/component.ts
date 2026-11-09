export const Component = {
  Application: Symbol.for('Application'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  DatabaseConnection: Symbol.for('DatabaseConnection'),
  DatabaseClient: Symbol.for('DatabaseClient'),
  UserModel: Symbol.for('UserModel'),
  OfferModel: Symbol.for('OfferModel'),
  UserService: Symbol.for('UserService'),
  OfferService: Symbol.for('OfferService')
} as const;
