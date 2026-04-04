import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import stockRoutes from './src/routes/stockRoutes.js';
import searchRoutes from './src/routes/searchRoutes.js';
import newsRoutes from './src/routes/newsRoutes.js';
import sentimentRoutes from './src/routes/sentimentRoutes.js';
import errorHandler from './src/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(join(__dirname, 'public')));

  app.use('/api/stock', stockRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/news', newsRoutes);
  app.use('/api/market', sentimentRoutes);

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

export function startServer(port = process.env.PORT || 3000) {
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Stock Analyzer 서버 실행 중: http://localhost:${port}`);
  });

  return server;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  startServer();
}
