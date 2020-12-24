import process from 'process';
import { createConnection } from 'typeorm';
import express from 'express';

import createAppRoutes from './routes';
import createEventHandlers from './event-adapter';

const startService = async (): Promise<void> => {
  await createConnection();

  const app = express();
  createAppRoutes(app);
  createEventHandlers();

  await new Promise<void>((resolve, reject) => {
    try {
      app.listen(
        parseInt(process.env.SERVER_PORT ?? '3000', 10) ?? 3000,
        process.env.SERVER_HOST ?? 'localhost',
        resolve,
      );
    } catch (err) {
      reject(err);
    }
  });
};

startService().catch((err): void => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
