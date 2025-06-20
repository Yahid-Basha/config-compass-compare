import React, { useState } from 'react';
import { Upload, FileText, Eye, Download, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import FileUploader from '@/components/FileUploader';
import DiffViewer from '@/components/DiffViewer';
import SummaryPanel from '@/components/SummaryPanel';
import FilePreview from '@/components/FilePreview';
import { FileParser } from '@/utils/fileParser';
import { FileComparator, ComparisonResult } from '@/utils/fileComparator';
import { FormatDetector } from '@/utils/formatDetector';

const Index = () => {
  const [sourceContent, setSourceContent] = useState('');
  const [targetContent, setTargetContent] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste'>('upload');
  const [fileFormat, setFileFormat] = useState<'json' | 'xml' | 'yaml'>('json');
  const [sourceDetectedFormat, setSourceDetectedFormat] = useState<'json' | 'xml' | 'yaml'>('json');
  const [targetDetectedFormat, setTargetDetectedFormat] = useState<'json' | 'xml' | 'yaml'>('json');
  const [ignoreKeys, setIgnoreKeys] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFileUpload = (files: { source?: File; target?: File }) => {
    if (files.source) {
      setSourceFile(files.source);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        setSourceContent(content);
        
        // Detect format for source file
        const detectedFormat = FormatDetector.detectFormat(content, files.source?.name);
        setSourceDetectedFormat(detectedFormat);
        
        // Set the main file format if this is the first file
        if (!targetContent) {
          setFileFormat(detectedFormat);
        }
      };
      reader.readAsText(files.source);
    }
    if (files.target) {
      setTargetFile(files.target);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        setTargetContent(content);
        
        // Detect format for target file
        const detectedFormat = FormatDetector.detectFormat(content, files.target?.name);
        setTargetDetectedFormat(detectedFormat);
        
        // Set the main file format if this is the first file
        if (!sourceContent) {
          setFileFormat(detectedFormat);
        }
      };
      reader.readAsText(files.target);
    }
  };

  const compareFiles = async (): Promise<ComparisonResult> => {
    try {
      // Check if formats match
      if (sourceDetectedFormat !== targetDetectedFormat) {
        throw new Error(`Format mismatch: Source file is ${sourceDetectedFormat.toUpperCase()} but target file is ${targetDetectedFormat.toUpperCase()}. Both files must be in the same format to compare.`);
      }

      // Use the detected format for comparison
      const comparisonFormat = sourceDetectedFormat;

      // Validate format for both files
      if (!FormatDetector.validateFormat(sourceContent, comparisonFormat)) {
        throw new Error(`Source file contains invalid ${comparisonFormat.toUpperCase()} format. Please check the file content and try again.`);
      }
      
      if (!FormatDetector.validateFormat(targetContent, comparisonFormat)) {
        throw new Error(`Target file contains invalid ${comparisonFormat.toUpperCase()} format. Please check the file content and try again.`);
      }

      // Parse both files
      const sourceData = FileParser.parse(sourceContent, comparisonFormat);
      const targetData = FileParser.parse(targetContent, comparisonFormat);

      // Prepare ignore keys
      const ignoreKeysList = ignoreKeys
        .split(',')
        .map(key => key.trim())
        .filter(Boolean);

      // Create comparator and compare
      const comparator = new FileComparator(ignoreKeysList, strictMode);
      const result = comparator.compare(sourceData, targetData, comparisonFormat);

      return result;
    } catch (error) {
      throw new Error(error.message || 'An unexpected error occurred during comparison');
    }
  };

  const handleCompare = async () => {
    if (!sourceContent || !targetContent) {
      toast.error('Please provide both source and target files to compare');
      return;
    }

    // Check for format mismatch before starting comparison
    if (sourceContent && targetContent && sourceDetectedFormat !== targetDetectedFormat) {
      toast.error(`Cannot compare files: Source is ${sourceDetectedFormat.toUpperCase()} but target is ${targetDetectedFormat.toUpperCase()}`, {
        description: 'Both files must be in the same format. Please upload files of the same type.'
      });
      return;
    }

    setIsComparing(true);
    try {
      const result = await compareFiles();
      setComparisonResult(result);
      setShowResult(true);
      
      const totalChanges = result.summary.additions + result.summary.deletions + result.summary.modifications;
      if (totalChanges === 0) {
        toast.success('Files are identical! No differences found.');
      } else {
        toast.success(`Comparison completed successfully! Found ${totalChanges} ${totalChanges === 1 ? 'change' : 'changes'}.`);
      }
    } catch (error) {
      toast.error('Comparison Failed', {
        description: error.message || 'An unexpected error occurred. Please check your files and try again.'
      });
      console.error('Comparison error:', error);
    } finally {
      setIsComparing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!comparisonResult) return;

    const report = {
      timestamp: new Date().toISOString(),
      summary: comparisonResult.summary,
      changes: comparisonResult.diff,
      settings: {
        format: sourceDetectedFormat,
        strictMode,
        ignoredKeys: ignoreKeys.split(',').filter(k => k.trim())
      },
      files: {
        source: sourceFile?.name || 'pasted-content',
        target: targetFile?.name || 'pasted-content'
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-diff-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully!');
  };

  const handleSimulateAlert = () => {
    if (!comparisonResult) return;
    
    const totalChanges = comparisonResult.summary.additions + comparisonResult.summary.deletions + comparisonResult.summary.modifications;
    toast.info(`Alert sent to Slack channel #config-changes!`, {
      description: `Found ${totalChanges} changes between configurations. Team has been notified.`
    });
  };

  const resetComparison = () => {
    setShowResult(false);
    setComparisonResult(null);
    setSourceContent('');
    setTargetContent('');
    setSourceFile(null);
    setTargetFile(null);
    setSourceDetectedFormat('json');
    setTargetDetectedFormat('json');
    setFileFormat('json');
  };

  // Auto-detect format when source content changes
  React.useEffect(() => {
    if (sourceContent && !sourceFile) {
      const detectedFormat = FormatDetector.detectFormat(sourceContent);
      setSourceDetectedFormat(detectedFormat);
      if (!targetContent) {
        setFileFormat(detectedFormat);
      }
    }
  }, [sourceContent, sourceFile, targetContent]);

  // Auto-detect format when target content changes
  React.useEffect(() => {
    if (targetContent && !targetFile) {
      const detectedFormat = FormatDetector.detectFormat(targetContent);
      setTargetDetectedFormat(detectedFormat);
      if (!sourceContent) {
        setFileFormat(detectedFormat);
      }
    }
  }, [targetContent, targetFile, sourceContent]);

  if (showResult && comparisonResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F0E2] to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration Comparison Results</h1>
              <p className="text-gray-600">Visual diff analysis and summary report</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">Format: {sourceDetectedFormat.toUpperCase()}</Badge>
                <Badge variant="outline">Mode: {strictMode ? 'Strict' : 'Lenient'}</Badge>
                {ignoreKeys && (
                  <Badge variant="outline">Ignored: {ignoreKeys.split(',').length} keys</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetComparison}>
                <FileText className="h-4 w-4 mr-2" />
                New Comparison
              </Button>
              <Button onClick={handleDownloadReport} className="bg-[#EE001E] hover:bg-[#EE001E]/90">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={handleSimulateAlert} variant="outline" className="border-[#FF281E] text-[#FF281E] hover:bg-[#FF281E]/10">
                <Bell className="h-4 w-4 mr-2" />
                Send Alert
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Summary Panel - Full Width at Top */}
            <div className="w-full">
              <SummaryPanel summary={comparisonResult.summary} changes={comparisonResult.diff} />
            </div>

            {/* Visual Diff Viewer and Change Details - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Visual Diff Viewer - 65% (3/5 columns) */}
              <div className="lg:col-span-3">
                <DiffViewer 
                  sourceLines={comparisonResult.formatted_diff.source}
                  targetLines={comparisonResult.formatted_diff.target}
                  format={sourceDetectedFormat}
                />
              </div>
              
              {/* Change Details - 35% (2/5 columns) */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Change Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {comparisonResult.diff.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No changes detected</p>
                      ) : (
                        comparisonResult.diff.map((change, index) => {
                          const getChangeIcon = (type: string) => {
                            switch (type) {
                              case 'addition':
                                return <span className="text-green-600 font-bold">+</span>;
                              case 'deletion':
                                return <span className="text-red-600 font-bold">-</span>;
                              case 'modification':
                                return <span className="text-orange-600 font-bold">~</span>;
                              default:
                                return <FileText className="h-4 w-4 text-gray-600" />;
                            }
                          };

                          const getChangeColor = (type: string) => {
                            switch (type) {
                              case 'addition':
                                return 'text-green-700 bg-green-50 border-green-200';
                              case 'deletion':
                                return 'text-red-700 bg-red-50 border-red-200';
                              case 'modification':
                                return 'text-orange-700 bg-orange-50 border-orange-200';
                              default:
                                return 'text-gray-700 bg-gray-50 border-gray-200';
                            }
                          };

                          const formatValue = (value: any): string => {
                            if (typeof value === 'object') {
                              return JSON.stringify(value, null, 2);
                            }
                            return String(value);
                          };

                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getChangeColor(change.change_type)}`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                {getChangeIcon(change.change_type)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate" title={change.path}>
                                    {change.path}
                                  </p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {change.change_type}
                                  </Badge>
                                </div>
                              </div>
                              
                              {change.change_type === 'modification' && (
                                <div className="mt-2 space-y-1 text-xs">
                                  {change.old_value !== undefined && (
                                    <div className="bg-white/50 p-2 rounded border">
                                      <span className="font-medium text-red-700">- </span>
                                      <code className="text-red-800">
                                        {formatValue(change.old_value)}
                                      </code>
                                    </div>
                                  )}
                                  {change.new_value !== undefined && (
                                    <div className="bg-white/50 p-2 rounded border">
                                      <span className="font-medium text-green-700">+ </span>
                                      <code className="text-green-800">
                                        {formatValue(change.new_value)}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {change.change_type === 'addition' && change.new_value !== undefined && (
                                <div className="mt-2 text-xs">
                                  <div className="bg-white/50 p-2 rounded border">
                                    <code className="text-green-800">
                                      {formatValue(change.new_value)}
                                    </code>
                                  </div>
                                </div>
                              )}
                              
                              {change.change_type === 'deletion' && change.old_value !== undefined && (
                                <div className="mt-2 text-xs">
                                  <div className="bg-white/50 p-2 rounded border">
                                    <code className="text-red-800">
                                      {formatValue(change.old_value)}
                                    </code>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F0E2] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Config Compass Compare</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Compare configuration files with visual diffs and detailed analytics. 
            Supports JSON, XML, and YAML formats with intelligent parsing.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-[#EE001E] to-[#FF281E] text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Eye className="h-6 w-6" />
                File Comparison Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'upload' | 'paste')} className="mb-8">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File Upload
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Paste Content
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-6">
                  <FileUploader onFilesChange={handleFileUpload} />
                </TabsContent>

                <TabsContent value="paste" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="source-content" className="text-lg font-semibold mb-3 block">
                        Source File Content
                      </Label>
                      <Textarea
                        id="source-content"
                        placeholder="Paste your source configuration here..."
                        value={sourceContent}
                        onChange={(e) => setSourceContent(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="target-content" className="text-lg font-semibold mb-3 block">
                        Target File Content
                      </Label>
                      <Textarea
                        id="target-content"
                        placeholder="Paste your target configuration here..."
                        value={targetContent}
                        onChange={(e) => setTargetContent(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* File Preview Component */}
              <FilePreview
                sourceContent={sourceContent}
                targetContent={targetContent}
                sourceFile={sourceFile}
                targetFile={targetFile}
                sourceDetectedFormat={sourceDetectedFormat}
                targetDetectedFormat={targetDetectedFormat}
              />

              <Separator className="my-8" />

              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Comparison Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="format-select" className="text-sm font-medium mb-2 block">
                      File Format
                    </Label>
                    <select
                      id="format-select"
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value as 'json' | 'xml' | 'yaml')}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#EE001E] focus:border-transparent"
                    >
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="yaml">YAML</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-detected from file content
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="ignore-keys" className="text-sm font-medium mb-2 block">
                      Ignore Keys (comma-separated)
                    </Label>
                    <Input
                      id="ignore-keys"
                      placeholder="timestamp, version, id"
                      value={ignoreKeys}
                      onChange={(e) => setIgnoreKeys(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Keys to exclude from comparison
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Switch
                      id="strict-mode"
                      checked={strictMode}
                      onCheckedChange={setStrictMode}
                    />
                    <div>
                      <Label htmlFor="strict-mode" className="text-sm font-medium">
                        Strict Mode
                      </Label>
                      <p className="text-xs text-gray-500">
                        {strictMode ? 'Exact match including whitespace' : 'Lenient comparison'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleCompare}
                  disabled={isComparing || (!sourceContent || !targetContent) || (sourceContent && targetContent && sourceDetectedFormat !== targetDetectedFormat)}
                  size="lg"
                  className="bg-[#EE001E] hover:bg-[#EE001E]/90 text-white px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isComparing ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing Files...
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5 mr-3" />
                      Compare Files
                    </>
                  )}
                </Button>
              </div>

              {(sourceContent || targetContent) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      {sourceContent && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Source: {sourceContent.split('\n').length} lines ({sourceDetectedFormat.toUpperCase()})
                        </Badge>
                      )}
                      {targetContent && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Target: {targetContent.split('\n').length} lines ({targetDetectedFormat.toUpperCase()})
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {sourceContent && targetContent && sourceDetectedFormat !== targetDetectedFormat ? (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                          Format Mismatch
                        </Badge>
                      ) : sourceContent && targetContent ? (
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          Ready to Compare
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[#EE001E] text-[#EE001E]">
                          Waiting for Files
                        </Badge>
                      )}
                    </div>
                  </div>
                  {sourceContent && targetContent && sourceDetectedFormat !== targetDetectedFormat && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">
                        <strong>Cannot compare:</strong> Source file is {sourceDetectedFormat.toUpperCase()} but target file is {targetDetectedFormat.toUpperCase()}. 
                        Both files must be in the same format.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;