import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Download, FileText, Code, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FormatDetector } from '@/utils/formatDetector';

interface FilePreviewProps {
  sourceContent: string;
  targetContent: string;
  sourceFile: File | null;
  targetFile: File | null;
  detectedFormat: 'json' | 'xml' | 'yaml';
}

const FilePreview: React.FC<FilePreviewProps> = ({
  sourceContent,
  targetContent,
  sourceFile,
  targetFile,
  detectedFormat
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'source' | 'target'>('source');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLineCount = (content: string): number => {
    return content.split('\n').length;
  };

  const getCharacterCount = (content: string): number => {
    return content.length;
  };

  const validateContent = (content: string): { isValid: boolean; error?: string } => {
    if (!content.trim()) {
      return { isValid: false, error: 'Content is empty' };
    }

    try {
      const isValid = FormatDetector.validateFormat(content, detectedFormat);
      if (!isValid) {
        return { isValid: false, error: `Invalid ${detectedFormat.toUpperCase()} format` };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  };

  const copyToClipboard = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} content copied to clipboard!`);
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded successfully!`);
  };

  const formatContent = (content: string): string => {
    try {
      if (detectedFormat === 'json') {
        return JSON.stringify(JSON.parse(content), null, 2);
      }
      return content; // XML and YAML are already formatted
    } catch {
      return content; // Return as-is if formatting fails
    }
  };

  const renderFileInfo = (content: string, file: File | null, label: string) => {
    const validation = validateContent(content);
    const lineCount = getLineCount(content);
    const charCount = getCharacterCount(content);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{label}</span>
            {file && (
              <Badge variant="outline" className="text-xs">
                {file.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Valid {detectedFormat.toUpperCase()}
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Lines</div>
            <div className="font-semibold">{lineCount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Characters</div>
            <div className="font-semibold">{charCount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Size</div>
            <div className="font-semibold">
              {file ? formatFileSize(file.size) : formatFileSize(new Blob([content]).size)}
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Format</div>
            <div className="font-semibold">{detectedFormat.toUpperCase()}</div>
          </div>
        </div>

        {!validation.isValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Validation Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{validation.error}</p>
          </div>
        )}
      </div>
    );
  };

  const renderContentPreview = (content: string, file: File | null, label: string) => {
    const formattedContent = formatContent(content);
    const filename = file?.name || `${label.toLowerCase()}-content.${detectedFormat}`;

    return (
      <div className="space-y-4">
        {renderFileInfo(content, file, label)}
        
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Content Preview</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(formattedContent, label)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadContent(formattedContent, filename)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        <ScrollArea className="h-64 w-full border rounded-lg">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            <code className={`language-${detectedFormat}`}>
              {formattedContent}
            </code>
          </pre>
        </ScrollArea>
      </div>
    );
  };

  if (!sourceContent && !targetContent) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            File Preview
            <Badge variant="outline" className="ml-2">
              {detectedFormat.toUpperCase()}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Preview
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {sourceContent && targetContent ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'source' | 'target')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="source" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Source File
                  {sourceFile && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {sourceFile.name}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="target" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Target File
                  {targetFile && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {targetFile.name}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="source" className="mt-4">
                {renderContentPreview(sourceContent, sourceFile, 'Source')}
              </TabsContent>

              <TabsContent value="target" className="mt-4">
                {renderContentPreview(targetContent, targetFile, 'Target')}
              </TabsContent>
            </Tabs>
          ) : sourceContent ? (
            renderContentPreview(sourceContent, sourceFile, 'Source')
          ) : (
            renderContentPreview(targetContent, targetFile, 'Target')
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default FilePreview;