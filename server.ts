import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSyllabusWithGemini } from './server/syllabusAnalyzer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/syllabus/analyze', async (req, res) => {
    try {
      const body = req.body as { text?: unknown; sourceFileName?: unknown } | undefined;
      const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
      const sourceFileName =
        typeof body?.sourceFileName === 'string' ? body.sourceFileName.trim() : undefined;

      if (!rawText) {
        res.status(400).json({
          error: 'Syllabus text is empty. Please upload a document or enter your syllabus topics first.',
        });
        return;
      }

      const meaningfulChars = (rawText.match(/[A-Za-z0-9]/g) ?? []).length;
      if (meaningfulChars < 10) {
        res.status(400).json({
          error:
            'Syllabus text is too short or incomplete to analyse. Please provide at least a subject or topic list.',
        });
        return;
      }

      if (rawText.length > 100000) {
        res.status(400).json({
          error:
            'Syllabus text exceeds the 100,000 character limit. Please analyse one subject syllabus at a time.',
        });
        return;
      }

      const structured = await analyzeSyllabusWithGemini(rawText, sourceFileName);
      res.status(200).json(structured);
    } catch (err) {
      const errWithStatus = err as Error & { statusCode?: number };
      const statusCode =
        typeof errWithStatus?.statusCode === 'number' ? errWithStatus.statusCode : 500;
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'An unexpected error occurred while analysing the syllabus.';

      res.status(statusCode).json({ error: message });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SyllabusTube server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SyllabusTube server:', err);
  process.exit(1);
});
