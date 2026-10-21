import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './src/config/env.ts';
import { apiRouter } from './src/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // API Routes
  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Vite Dev Server middleware mode
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[IncidentIQ] Vite dev middleware attached.');
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[IncidentIQ AI] Control room server online at http://0.0.0.0:${port}`);
    console.log(`[IncidentIQ AI] Environment: ${env.NODE_ENV} | Model: ${env.GEMINI_MODEL}`);
  });
}

startServer().catch((err) => {
  console.error('[IncidentIQ] Failed to start server:', err);
  process.exit(1);
});
