export const CLIComponent = {
  Command: Symbol.for('CLI.Command'),
  ReaderFactory: Symbol.for('CLI.ReaderFactory'),
  GeneratorFactory: Symbol.for('CLI.GeneratorFactory'),
  LoadTemplates: Symbol.for('CLI.LoadTemplates'),
  SerializeOffer: Symbol.for('CLI.SerializeOffer')
} as const;
