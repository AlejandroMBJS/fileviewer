import React, { useState, ReactNode } from 'react';
import { Viewer } from './components/Viewer';
import { FileUploader } from './components/FileUploader';
import { Layers, Box, Info, Github, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileData {
  data: string | ArrayBuffer;
  type: 'dxf' | 'stl' | '3mf' | 'step';
  name: string;
}

export default function App() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileLoaded = (data: FileData) => {
    setIsLoading(true);
    // Simulate a bit of processing time for better UX
    setTimeout(() => {
      setFileData(data);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Box className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Blueprint<span className="text-blue-500">Viewer</span></h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Professional CAD Web Viewer</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Examples</a>
            <div className="w-px h-4 bg-neutral-800" />
            <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm font-medium transition-all">
              <Github size={16} />
              <span>Source</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!fileData ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                  Visualize your CAD designs <br />
                  <span className="text-neutral-500">directly in the browser.</span>
                </h2>
                <p className="text-neutral-400 max-w-lg mx-auto">
                  Upload your DXF blueprints to explore them in a high-performance 3D environment. 
                  No software installation required.
                </p>
              </div>

              <FileUploader onFileLoaded={handleFileLoaded} isLoading={isLoading} />

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                <FeatureCard 
                  icon={<Layers className="text-blue-400" />}
                  title="Layer Support"
                  description="Automatically handles complex CAD layers and entity groupings."
                />
                <FeatureCard 
                  icon={<Box className="text-purple-400" />}
                  title="3D Perspective"
                  description="Switch between 2D top-down and 3D perspective views effortlessly."
                />
                <FeatureCard 
                  icon={<FileCode className="text-emerald-400" />}
                  title="Open Standard"
                  description="Built on the DXF open standard for maximum compatibility."
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setFileData(null)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ← Upload Another
                  </button>
                  <div className="h-6 w-px bg-neutral-800" />
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Info size={14} />
                    <span>Use mouse to rotate, scroll to zoom, right-click to pan.</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Live Renderer</span>
                </div>
              </div>

              <div className="h-[75vh] w-full">
                <Viewer fileData={fileData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-neutral-800 py-12 mt-12 bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-neutral-500 text-sm">
            <Box size={16} />
            <span>© 2026 BlueprintViewer. Built for high-performance CAD visualization.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300">Privacy Policy</a>
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300">Terms of Service</a>
            <a href="#" className="text-xs text-neutral-500 hover:text-neutral-300">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors group">
      <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
  );
}
