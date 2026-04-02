import React, { useState, ReactNode } from 'react';
import { Viewer } from './components/Viewer';
import { FileUploader } from './components/FileUploader';
import { Layers, Box, Info, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileData } from './lib/cad-types';

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
    <div className="iris-shell min-h-screen text-neutral-200 font-sans selection:bg-cyan-400/30">
      <div className="iris-orb iris-orb-a" />
      <div className="iris-orb iris-orb-b" />
      <div className="iris-orb iris-orb-c" />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-neutral-950/35 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/8 shadow-[0_18px_45px_rgba(18,163,184,0.18)] backdrop-blur-xl">
              <Box className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">IRIS <span className="text-cyan-300">CAD Viewer</span></h1>
              <p className="text-[10px] text-cyan-100/45 uppercase tracking-[0.35em] font-semibold text-center md:text-left">secure tool to review confidential files without risk (nothing save it)</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 rounded-full border border-white/8 bg-white/6 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/55 backdrop-blur-xl">
            <span>DXF</span>
            <span>DWG</span>
            <span>STL</span>
            <span>STP</span>
            <span>3MF</span>
          </div>
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
              <div className="iris-glass-panel w-full max-w-5xl rounded-[2rem] px-6 py-10 md:px-10 md:py-14">
                <div className="mb-10">
                  <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-100/70">
                    secure tool to review confidential files without risk (nothing save it)
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-4 tracking-tight md:text-6xl">
                    Review industrial drawings
                    <br />
                    <span className="text-white/45">through a crystal-clear viewer.</span>
                  </h2>
                  <p className="text-neutral-400 max-w-2xl mx-auto text-sm leading-7 md:text-base">
                    Open DXF, DWG, STL, STP/STEP and 3MF files in a single browser workspace built for quick internal review.
                  </p>
                </div>

                <FileUploader onFileLoaded={handleFileLoaded} isLoading={isLoading} />
              </div>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
                <FeatureCard 
                  icon={<Layers className="text-cyan-300" />}
                  title="2D Drawings"
                  description="Review floor plans, layouts, and machine drawings with a centered, drawing-safe camera."
                />
                <FeatureCard 
                  icon={<Box className="text-sky-200" />}
                  title="3D Models"
                  description="Inspect STL, STEP, and 3MF parts with controlled lighting and cleaner framing."
                />
                <FeatureCard 
                  icon={<FileCode className="text-emerald-400" />}
                  title="DWG Intake"
                  description="DWG files are converted on the backend so engineering teams can keep using native drawings."
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
              <div className="iris-glass-panel flex flex-col gap-4 rounded-[1.6rem] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <button 
                    onClick={() => setFileData(null)}
                    className="rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/14"
                  >
                    ← Upload Another
                  </button>
                  <div className="hidden h-6 w-px bg-white/10 md:block" />
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Info size={14} />
                    <span>Use mouse to rotate, scroll to zoom, right-click to pan.</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-start md:self-auto">
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

      <footer className="mt-12 border-t border-white/8 bg-neutral-950/25 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-neutral-500 text-sm">
            <Box size={16} />
            <span>© 2026 IRIS CAD Viewer</span>
          </div>
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/45">secure tool to review confidential files without risk (nothing save it)</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode, title: string, description: string }) {
  return (
    <div className="iris-glass-card rounded-[1.5rem] p-6 text-left transition-all duration-300 group hover:-translate-y-1">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
    </div>
  );
}
