import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const upload = multer({ storage: multer.memoryStorage() });
const execFileAsync = promisify(execFile);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get('/occt-import-js.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(process.cwd(), 'node_modules/occt-import-js/dist/occt-import-js.js'));
  });

  app.get('/occt-import-js.wasm', (req, res) => {
    res.setHeader('Content-Type', 'application/wasm');
    res.sendFile(path.join(process.cwd(), 'node_modules/occt-import-js/dist/occt-import-js.wasm'));
  });

  app.post('/api/convert-dwg', upload.single('file'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: 'No DWG file was uploaded.' });
      return;
    }

    try {
      const dxfText = await convertDwgBufferToDxf(req.file.originalname, req.file.buffer);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(dxfText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DWG to DXF conversion failed.';
      res.status(503).json({ message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

async function convertDwgBufferToDxf(originalName: string, fileBuffer: Buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileviewer-dwg-'));
  const safeBaseName = sanitizeBaseName(path.parse(originalName).name);
  const inputPath = path.join(tempDir, `${safeBaseName}.dwg`);
  const outputPath = path.join(tempDir, `${safeBaseName}.dxf`);

  try {
    await fs.writeFile(inputPath, fileBuffer);
    await runDwgConverter(inputPath, outputPath);

    const dxfText = await fs.readFile(outputPath, 'utf8');
    if (!dxfText.trim()) {
      throw new Error('The DWG converter returned an empty DXF output.');
    }

    return dxfText;
  } catch (error: any) {
    const stderr = error?.stderr?.toString?.().trim();
    const stdout = error?.stdout?.toString?.().trim();
    const details = stderr || stdout;

    if (details?.includes('command not found')) {
      throw new Error(
        'No DWG converter is installed. Install a converter such as `dwg2dxf` or set `DWG_CONVERTER_CMD` in the server environment.'
      );
    }

    throw new Error(details || error?.message || 'DWG to DXF conversion failed.');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function runDwgConverter(inputPath: string, outputPath: string) {
  const commandTemplate = process.env.DWG_CONVERTER_CMD?.trim() || 'bash ./scripts/convert-dwg.sh {input} {output}';
  const command = commandTemplate
    .replaceAll('{input}', quoteShellPath(inputPath))
    .replaceAll('{output}', quoteShellPath(outputPath));

  await execFileAsync('/bin/bash', ['-lc', command], {
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function sanitizeBaseName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'drawing';
}

function quoteShellPath(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
