import React, { useCallback, useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFilesChange: (files: { source?: File; target?: File }) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesChange }) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<'source' | 'target' | null>(null);

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.json', '.xml', '.yaml', '.yml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 5MB.`);
      return false;
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(extension)) {
      toast.error(`Unsupported file type. Please use: ${validExtensions.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleFileUpload = (file: File, type: 'source' | 'target') => {
    if (!validateFile(file)) return;

    if (type === 'source') {
      setSourceFile(file);
      onFilesChange({ source: file });
    } else {
      setTargetFile(file);
      onFilesChange({ target: file });
    }

    toast.success(`${type === 'source' ? 'Source' : 'Target'} file uploaded successfully!`);
  };

  const handleDrop = useCallback((e: React.DragEvent, type: 'source' | 'target') => {
    e.preventDefault();
    setDragOver(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], type);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, type: 'source' | 'target') => {
    e.preventDefault();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  const removeFile = (type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceFile(null);
      onFilesChange({ target: targetFile || undefined });
    } else {
      setTargetFile(null);
      onFilesChange({ source: sourceFile || undefined });
    }
  };

  const FileDropZone = ({ type, file }: { type: 'source' | 'target'; file: File | null }) => (
    <Card className={`relative transition-all duration-200 backdrop-blur-md border-white/20 shadow-lg rounded-3xl ${
      dragOver === type 
        ? 'border-[#EE001E] border-2 bg-[#EE001E]/5 shadow-xl' 
        : 'border-dashed border-2 border-gray-300/50 hover:border-gray-400/50 bg-white/70'
    }`}>
      <CardContent className="p-8">
        <div
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={handleDragLeave}
          className="text-center"
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="p-3 bg-green-100/70 rounded-full backdrop-blur-sm">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeFile(type)}
                className="text-red-600 border-red-300/70 hover:bg-red-50 backdrop-blur-sm bg-white/80 border shadow-md rounded-2xl hover:shadow-lg transition-all duration-200"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className={`p-4 rounded-full ${
                  dragOver === type ? 'bg-[#EE001E]/10' : 'bg-gray-100/70'
                } backdrop-blur-sm`}>
                  <Upload className={`h-10 w-10 ${
                    dragOver === type ? 'text-[#EE001E]' : 'text-gray-400'
                  }`} />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {type === 'source' ? 'Source' : 'Target'} File
                </p>
                <p className="text-gray-600 mb-4">
                  Drop your {type === 'source' ? 'source' : 'target'} config file here, or click to upload
                </p>
                <input
                  type="file"
                  accept=".json,.xml,.yaml,.yml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, type);
                  }}
                  className="hidden"
                  id={`${type}-file-input`}
                />
                <label
                  htmlFor={`${type}-file-input`}
                  className="cursor-pointer inline-flex items-center px-4 py-2 backdrop-blur-sm bg-white/80 border border-gray-300/70 rounded-2xl shadow-md text-sm font-medium text-gray-700 hover:bg-white/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EE001E] focus:border-transparent transition-all duration-200"
                >
                  <File className="h-4 w-4 mr-2" />
                  Choose File
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: JSON, XML, YAML • Max size: 5MB
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FileDropZone type="source" file={sourceFile} />
      <FileDropZone type="target" file={targetFile} />
    </div>
  );
};

export default FileUploader;
