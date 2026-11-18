import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ENV } from './server/config/env';
import { apiRouter } from './server/routes/api';
import { AVATARS_DIR } from './server/services/store';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Servir avatares salvos localmente quando Storage externo não está configurado
  app.get('/api/avatars/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(AVATARS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Avatar não encontrado.' });
      return;
    }
    res.sendFile(filePath);
  });

  // Rotas de API
  app.use('/api', apiRouter);

  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`PoupaJunto server listening on http://0.0.0.0:${ENV.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PoupaJunto server:', err);
  process.exit(1);
});
