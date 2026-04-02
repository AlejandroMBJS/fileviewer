import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDwgToDxf } from '../lib/model-loaders';
import { FileData, getFileTypeFromName, SUPPORTED_FILE_LABELS } from '../lib/cad-types';

interface FileUploaderProps {
  onFileLoaded: (fileData: FileData) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded, isLoading }) => {
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setError(null);

    const fileType = getFileTypeFromName(file.name);

    if (!fileType) {
      setError('Unsupported file type. Use DXF, DWG, STL, STP, STEP, or 3MF.');
      return;
    }

    if (fileType === 'dwg') {
      setIsConverting(true);
      try {
        const dxfText = await convertDwgToDxf(file);
        onFileLoaded({
          data: dxfText,
          type: 'dxf',
          name: file.name.replace(/\.[^.]+$/i, '.dxf')
        });
      } catch (err: any) {
        setError(err.message || 'Failed to convert DWG file.');
      } finally {
        setIsConverting(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return;

      if (fileType === 'dxf' && typeof result === 'string') {
        // Simple check for binary DXF (starts with "AutoCAD Binary DXF")
        if (result.startsWith('AutoCAD Binary DXF')) {
          setError('This file appears to be a Binary DXF. Please use ASCII DXF format.');
          return;
        }
      }

      onFileLoaded({
        data: result,
        type: fileType,
        name: file.name
      });
    };

    if (fileType === 'dxf') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [onFileLoaded]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.stl', '.stp', '.step', '.dwg'],
      'model/3mf': ['.3mf'],
      'text/plain': ['.dxf'],
      'application/dxf': ['.dxf'],
      'model/stl': ['.stl'],
      'application/step': ['.step', '.stp'],
      'image/vnd.dwg': ['.dwg'],
      'application/x-dwg': ['.dwg'],
    },
    multiple: false,
  } as any);

  const loading = isLoading || isConverting;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "iris-glass-card relative group cursor-pointer rounded-[1.75rem] p-12 text-center transition-all duration-300",
          "border border-dashed",
          isDragActive 
            ? "border-cyan-300/45 bg-cyan-300/8 shadow-[0_24px_60px_rgba(34,211,238,0.08)]" 
            : "border-white/12 hover:border-cyan-200/30 bg-white/5",
          loading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-full transition-transform duration-300 group-hover:scale-110",
            isDragActive ? "bg-cyan-300/18 text-cyan-200" : "bg-white/8 text-neutral-300"
          )}>
            {loading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">
              {loading ? (isConverting ? "Converting DWG to DXF..." : "Processing file...") : (isDragActive ? "Drop the file here" : "Upload your CAD file")}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Supports DXF, DWG, STL, STP, STEP, and 3MF
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {SUPPORTED_FILE_LABELS.map((ext) => (
              <div key={ext} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2.5 py-1">
                <FileText size={12} className="text-neutral-500" />
                <span className="text-[10px] font-bold text-neutral-300">{ext}</span>
              </div>
            ))}
          </div>
        </div>

        {(fileRejections.length > 0 || error) && (
          <div className="mt-4 flex flex-col items-center gap-2 text-red-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error || "Invalid file type"}</span>
            </div>
          </div>
        )}
      </div>

      <div className="iris-glass-card mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-300/6 p-4">
        <p className="text-xs leading-relaxed text-cyan-100/78">
          <span className="font-bold">Auto-Conversion:</span> DWG files are converted to DXF on the backend before rendering. STL and STP/STEP files open directly in the 3D viewer.
        </p>
      </div>
    </div>
  );
};
