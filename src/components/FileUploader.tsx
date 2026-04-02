import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { convertDwgToDxf } from '../lib/model-loaders';

interface FileData {
  data: string | ArrayBuffer;
  type: 'dxf' | 'stl' | '3mf' | 'step';
  name: string;
}

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

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'dwg') {
      setIsConverting(true);
      try {
        const dxfText = await convertDwgToDxf(file);
        onFileLoaded({
          data: dxfText,
          type: 'dxf',
          name: file.name.replace('.dwg', '.dxf')
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

      if (extension === 'dxf' && typeof result === 'string') {
        // Simple check for binary DXF (starts with "AutoCAD Binary DXF")
        if (result.startsWith('AutoCAD Binary DXF')) {
          setError('This file appears to be a Binary DXF. Please use ASCII DXF format.');
          return;
        }
      }

      let type: 'dxf' | 'stl' | '3mf' | 'step' = 'dxf';
      if (extension === 'stl') type = 'stl';
      else if (extension === '3mf') type = '3mf';
      else if (extension === 'step' || extension === 'stp') type = 'step';

      onFileLoaded({
        data: result,
        type,
        name: file.name
      });
    };

    if (extension === 'dxf') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [onFileLoaded]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/dxf': ['.dxf'],
      'model/stl': ['.stl'],
      'model/3mf': ['.3mf'],
      'application/step': ['.step', '.stp'],
      'image/vnd.dwg': ['.dwg'],
      'application/x-dwg': ['.dwg'],
      'text/plain': ['.dxf'],
    },
    multiple: false,
  } as any);

  const loading = isLoading || isConverting;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer transition-all duration-300",
          "border-2 border-dashed rounded-2xl p-12 text-center",
          isDragActive 
            ? "border-blue-500 bg-blue-500/5" 
            : "border-neutral-700 hover:border-neutral-500 bg-neutral-800/30",
          loading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-full transition-transform duration-300 group-hover:scale-110",
            isDragActive ? "bg-blue-500/20 text-blue-400" : "bg-neutral-800 text-neutral-400"
          )}>
            {loading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">
              {loading ? (isConverting ? "Converting DWG to DXF..." : "Processing file...") : (isDragActive ? "Drop the file here" : "Upload your 3D model")}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              Supports DXF, STL, 3MF, STEP, and DWG
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['DXF', 'STL', '3MF', 'STEP', 'DWG'].map(ext => (
              <div key={ext} className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 rounded-full border border-neutral-700">
                <FileText size={12} className="text-neutral-500" />
                <span className="text-[10px] font-bold text-neutral-400">{ext}</span>
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

      <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <p className="text-xs text-blue-400 leading-relaxed">
          <span className="font-bold">Auto-Conversion:</span> DWG files are automatically converted to DXF for viewing. 3D formats like STL and STEP are rendered with full perspective and lighting.
        </p>
      </div>
    </div>
  );
};
