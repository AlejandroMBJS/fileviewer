import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get('/occt-import-js.wasm', (req, res) => {
    res.setHeader('Content-Type', 'application/wasm');
    res.sendFile(path.join(process.cwd(), 'node_modules/occt-import-js/dist/occt-import-js.wasm'));
  });

  app.post('/api/convert-dwg', upload.single('file'), (req, res) => {
    // In a real scenario, you would call a binary like 'dwg2dxf' here.
    // Since we cannot easily install system binaries in this sandbox,
    // we return an error message explaining the limitation or a mock response.
    
    // Note: To support real DWG conversion, one would need to install:
    // sudo apt-get install librecad
    // and then use child_process.exec('dwg2dxf input.dwg output.dxf')
    
    res.status(501).json({ 
      message: 'DWG to DXF conversion requires system-level CAD utilities (like LibreCAD or ODA) which are not available in this sandboxed preview environment. Please upload DXF files directly.' 
    });
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
