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
  sourceDetectedFormat: 'json' | 'xml' | 'yaml';
  targetDetectedFormat: 'json' | 'xml' | 'yaml';
}

const FilePreview: React.FC<FilePreviewProps> = ({
  sourceContent,
  targetContent,
  sourceFile,
  targetFile,
  sourceDetectedFormat,
  targetDetectedFormat
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

  const validateContent = (content: string, format: 'json' | 'xml' | 'yaml'): { isValid: boolean; error?: string } => {
    if (!content.trim()) {
      return { isValid: false, error: 'Content is empty' };
    }

    try {
      const isValid = FormatDetector.validateFormat(content, format);
      if (!isValid) {
        return { isValid: false, error: `Invalid ${format.toUpperCase()} format. Please check the syntax and structure.` };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `${format.toUpperCase()} parsing error: ${error.message}` };
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

  const formatContent = (content: string, format: 'json' | 'xml' | 'yaml'): string => {
    try {
      if (format === 'json') {
        return JSON.stringify(JSON.parse(content), null, 2);
      }
      return content; // XML and YAML are already formatted
    } catch {
      return content; // Return as-is if formatting fails
    }
  };

  const renderFileInfo = (content: string, file: File | null, label: string, format: 'json' | 'xml' | 'yaml') => {
    const validation = validateContent(content, format);
    const lineCount = getLineCount(content);
    const charCount = getCharacterCount(content);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{label}</span>
            {file && (
              <Badge variant="outline" className="text-xs backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                {file.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <Badge className="bg-green-100/70 text-green-800 border-green-300/50 backdrop-blur-sm rounded-xl">
                Valid {format.toUpperCase()}
              </Badge>
            ) : (
              <Badge className="bg-red-100/70 text-red-800 border-red-300/50 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-3 w-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50/70 p-2 rounded-xl backdrop-blur-sm">
            <div className="text-gray-600">Lines</div>
            <div className="font-semibold">{lineCount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50/70 p-2 rounded-xl backdrop-blur-sm">
            <div className="text-gray-600">Characters</div>
            <div className="font-semibold">{charCount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50/70 p-2 rounded-xl backdrop-blur-sm">
            <div className="text-gray-600">Size</div>
            <div className="font-semibold">
              {file ? formatFileSize(file.size) : formatFileSize(new Blob([content]).size)}
            </div>
          </div>
          <div className="bg-gray-50/70 p-2 rounded-xl backdrop-blur-sm">
            <div className="text-gray-600">Format</div>
            <div className="font-semibold">{format.toUpperCase()}</div>
          </div>
        </div>

        {!validation.isValid && (
          <div className="bg-red-50/70 border border-red-200/50 rounded-2xl p-3 backdrop-blur-sm">
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

  const renderContentPreview = (content: string, file: File | null, label: string, format: 'json' | 'xml' | 'yaml') => {
    const formattedContent = formatContent(content, format);
    const filename = file?.name || `${label.toLowerCase()}-content.${format}`;

    return (
      <div className="space-y-4">
        {renderFileInfo(content, file, label, format)}
        
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Content Preview</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(formattedContent, label)}
              className="border-2 border-white hover:border-gray-300 rounded-xl"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadContent(formattedContent, filename)}
              className="border-2 border-white hover:border-gray-300 rounded-xl"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        <ScrollArea className="h-64 w-full border-2 border-white rounded-2xl backdrop-blur-sm bg-white/70">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            <code className={`language-${format}`}>
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

  // Show format mismatch warning if both files are present but formats differ
  const showFormatMismatch = sourceContent && targetContent && sourceDetectedFormat !== targetDetectedFormat;

  return (
    <Card className="mt-6 backdrop-blur-md bg-white/80 border-white/20 shadow-xl rounded-3xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            File Preview
            {sourceContent && targetContent ? (
              <div className="flex gap-2 ml-2">
                <Badge variant="outline" className="backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                  Source: {sourceDetectedFormat.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                  Target: {targetDetectedFormat.toUpperCase()}
                </Badge>
              </div>
            ) : (
              <Badge variant="outline" className="ml-2 backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                {sourceContent ? sourceDetectedFormat.toUpperCase() : targetDetectedFormat.toUpperCase()}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-2 border-white hover:border-gray-300 rounded-xl"
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
        {showFormatMismatch && (
          <div className="mt-3 p-3 bg-red-50/70 border border-red-200/50 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Format Mismatch Detected</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Source file is {sourceDetectedFormat.toUpperCase()} but target file is {targetDetectedFormat.toUpperCase()}. 
              Both files must be in the same format to perform comparison.
            </p>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {sourceContent && targetContent ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'source' | 'target')}>
              <TabsList className="grid w-full grid-cols-2 backdrop-blur-sm bg-white/70 border-2 border-white rounded-2xl">
                <TabsTrigger value="source" className="flex items-center gap-2 rounded-2xl border-2 border-transparent data-[state=active]:border-white">
                  <FileText className="h-4 w-4" />
                  Source File
                  {sourceFile && (
                    <Badge variant="secondary" className="ml-1 text-xs backdrop-blur-sm bg-white/70 rounded-xl">
                      {sourceFile.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="ml-1 text-xs backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                    {sourceDetectedFormat.toUpperCase()}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="target" className="flex items-center gap-2 rounded-2xl border-2 border-transparent data-[state=active]:border-white">
                  <FileText className="h-4 w-4" />
                  Target File
                  {targetFile && (
                    <Badge variant="secondary" className="ml-1 text-xs backdrop-blur-sm bg-white/70 rounded-xl">
                      {targetFile.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="ml-1 text-xs backdrop-blur-sm bg-white/70 border-white/20 rounded-xl">
                    {targetDetectedFormat.toUpperCase()}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="source" className="mt-4">
                {renderContentPreview(sourceContent, sourceFile, 'Source', sourceDetectedFormat)}
              </TabsContent>

              <TabsContent value="target" className="mt-4">
                {renderContentPreview(targetContent, targetFile, 'Target', targetDetectedFormat)}
              </TabsContent>
            </Tabs>
          ) : sourceContent ? (
            renderContentPreview(sourceContent, sourceFile, 'Source', sourceDetectedFormat)
          ) : (
            renderContentPreview(targetContent, targetFile, 'Target', targetDetectedFormat)
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default FilePreview;