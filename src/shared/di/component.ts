export const Component = {
  Application: Symbol.for('Application'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  DatabaseConnection: Symbol.for('DatabaseConnection'),
  DatabaseClient: Symbol.for('DatabaseClient'),
  UserModel: Symbol.for('UserModel'),
  OfferModel: Symbol.for('OfferModel'),
  UserService: Symbol.for('UserService'),
  OfferService: Symbol.for('OfferService'),
  CommentModel: Symbol.for('CommentModel'),
  CommentService: Symbol.for('CommentService')
} as const;
