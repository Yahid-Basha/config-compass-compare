import React, { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { FilePreview } from '@/components/FilePreview';
import { DiffViewer } from '@/components/DiffViewer';
import { SummaryPanel } from '@/components/SummaryPanel';
import { FileComparator } from '@/utils/fileComparator';
import { FileParser } from '@/utils/fileParser';
import { FormatDetector } from '@/utils/formatDetector';

interface FileData {
  name: string;
  content: string;
  format: string;
}

const Index = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const handleFileUpload = async (uploadedFiles: File[]) => {
    const fileData: FileData[] = [];
    
    for (const file of uploadedFiles) {
      const content = await file.text();
      const format = FormatDetector.detectFormat(file.name, content);
      
      fileData.push({
        name: file.name,
        content,
        format
      });
    }
    
    setFiles(fileData);
    
    // If we have 2 files, automatically compare them
    if (fileData.length === 2) {
      const parsed1 = FileParser.parse(fileData[0].content, fileData[0].format);
      const parsed2 = FileParser.parse(fileData[1].content, fileData[1].format);
      const result = FileComparator.compare(parsed1, parsed2);
      setComparisonResult(result);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Configuration File Comparator
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FileUploader onFilesUploaded={handleFileUpload} />
          
          {files.length > 0 && (
            <div className="space-y-4">
              {files.map((file, index) => (
                <FilePreview
                  key={index}
                  fileName={file.name}
                  content={file.content}
                  format={file.format}
                />
              ))}
            </div>
          )}
        </div>
        
        {comparisonResult && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <DiffViewer
                original={files[0]?.content || ''}
                modified={files[1]?.content || ''}
                originalFileName={files[0]?.name || 'File 1'}
                modifiedFileName={files[1]?.name || 'File 2'}
              />
            </div>
            
            <div>
              <SummaryPanel
                differences={comparisonResult.differences}
                stats={comparisonResult.stats}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;