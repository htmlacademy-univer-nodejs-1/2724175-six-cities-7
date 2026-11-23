import { createContainer } from '../../dist/shared/di/container.js';
import { Component } from '../../dist/shared/di/component.js';

const container = createContainer();
container.rebind(Component.DatabaseClient).toConstantValue({ connect: async () => {}, disconnect: async () => {} });
container.get(Component.Config).init();
const server = await container.get(Component.Application).init();
await new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
});
