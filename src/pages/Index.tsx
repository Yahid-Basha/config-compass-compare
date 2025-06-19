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

interface ComparisonResult {
  summary: {
    additions: number;
    deletions: number;
    modifications: number;
  };
  diff: Array<{
    path: string;
    change_type: 'addition' | 'deletion' | 'modification';
    old_value?: any;
    new_value?: any;
  }>;
  formatted_diff: {
    source: string[];
    target: string[];
  };
}

const Index = () => {
  const [sourceContent, setSourceContent] = useState('');
  const [targetContent, setTargetContent] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste'>('upload');
  const [fileFormat, setFileFormat] = useState<'json' | 'xml' | 'yaml'>('json');
  const [ignoreKeys, setIgnoreKeys] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFileUpload = (files: { source?: File; target?: File }) => {
    if (files.source) {
      setSourceFile(files.source);
      const reader = new FileReader();
      reader.onload = (e) => setSourceContent(e.target?.result as string || '');
      reader.readAsText(files.source);
    }
    if (files.target) {
      setTargetFile(files.target);
      const reader = new FileReader();
      reader.onload = (e) => setTargetContent(e.target?.result as string || '');
      reader.readAsText(files.target);
    }
  };

  const detectFileFormat = (content: string, filename?: string): 'json' | 'xml' | 'yaml' => {
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'json') return 'json';
      if (ext === 'xml') return 'xml';
      if (ext === 'yaml' || ext === 'yml') return 'yaml';
    }

    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('<')) return 'xml';
    return 'yaml';
  };

  const generateMockDiffForFormat = (format: 'json' | 'xml' | 'yaml') => {
    if (format === 'json') {
      return {
        source: [
          '{',
          '  "database": {',
          '-    "host": "localhost",',
          '     "port": 5432',
          '  },',
          '  "features": {',
          '     "authentication": true',
          '  },',
          '-  "deprecated": {',
          '-    "oldSetting": "removed"',
          '-  }'
        ],
        target: [
          '{',
          '  "database": {',
          '+    "host": "prod-db.example.com",',
          '     "port": 5432',
          '  },',
          '  "features": {',
          '     "authentication": true,',
          '+    "newFeature": true',
          '  }',
          '}'
        ]
      };
    } else if (format === 'xml') {
      return {
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<configuration>',
          '  <database>',
          '-    <host>localhost</host>',
          '     <port>5432</port>',
          '  </database>',
          '  <features>',
          '     <authentication>true</authentication>',
          '  </features>',
          '-  <deprecated>',
          '-    <oldSetting>removed</oldSetting>',
          '-  </deprecated>',
          '</configuration>'
        ],
        target: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<configuration>',
          '  <database>',
          '+    <host>prod-db.example.com</host>',
          '     <port>5432</port>',
          '  </database>',
          '  <features>',
          '     <authentication>true</authentication>',
          '+    <newFeature>true</newFeature>',
          '  </features>',
          '</configuration>'
        ]
      };
    } else { // yaml
      return {
        source: [
          'database:',
          '-  host: localhost',
          '   port: 5432',
          'features:',
          '   authentication: true',
          '-deprecated:',
          '-  oldSetting: removed'
        ],
        target: [
          'database:',
          '+  host: prod-db.example.com',
          '   port: 5432',
          'features:',
          '   authentication: true',
          '+  newFeature: true'
        ]
      };
    }
  };

  const mockCompareFiles = async (): Promise<ComparisonResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockDiff = generateMockDiffForFormat(fileFormat);

    return {
      summary: {
        additions: 3,
        deletions: 2,
        modifications: 5
      },
      diff: [
        {
          path: 'config.database.host',
          change_type: 'modification',
          old_value: 'localhost',
          new_value: 'prod-db.example.com'
        },
        {
          path: 'config.features.newFeature',
          change_type: 'addition',
          new_value: true
        },
        {
          path: 'config.deprecated.oldSetting',
          change_type: 'deletion',
          old_value: 'removed'
        }
      ],
      formatted_diff: mockDiff
    };
  };

  const handleCompare = async () => {
    if (!sourceContent || !targetContent) {
      toast.error('Please provide both source and target files');
      return;
    }

    setIsComparing(true);
    try {
      const detectedFormat = detectFileFormat(
        sourceContent, 
        sourceFile?.name || targetFile?.name
      );
      setFileFormat(detectedFormat);

      // In a real implementation, this would call the backend API
      const result = await mockCompareFiles();
      setComparisonResult(result);
      setShowResult(true);
      toast.success('Comparison completed successfully!');
    } catch (error) {
      toast.error('Failed to compare files. Please check the format and try again.');
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
        format: fileFormat,
        strictMode,
        ignoredKeys: ignoreKeys.split(',').filter(k => k.trim())
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
    toast.info('Alert sent to Slack channel #config-changes!', {
      description: 'Team has been notified about configuration differences.'
    });
  };

  const resetComparison = () => {
    setShowResult(false);
    setComparisonResult(null);
    setSourceContent('');
    setTargetContent('');
    setSourceFile(null);
    setTargetFile(null);
  };

  if (showResult && comparisonResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F0E2] to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration Comparison Results</h1>
              <p className="text-gray-600">Visual diff analysis and summary report</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SummaryPanel summary={comparisonResult.summary} changes={comparisonResult.diff} />
            </div>
            <div className="lg:col-span-3">
              <DiffViewer 
                sourceLines={comparisonResult.formatted_diff.source}
                targetLines={comparisonResult.formatted_diff.target}
                format={fileFormat}
              />
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
            Supports JSON, XML, and YAML formats.
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
                  disabled={isComparing || (!sourceContent || !targetContent)}
                  size="lg"
                  className="bg-[#EE001E] hover:bg-[#EE001E]/90 text-white px-8 py-3 text-lg"
                >
                  {isComparing ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" />
                      Comparing Files...
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
                          Source: {sourceContent.split('\n').length} lines
                        </Badge>
                      )}
                      {targetContent && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Target: {targetContent.split('\n').length} lines
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="border-[#EE001E] text-[#EE001E]">
                      Format: {fileFormat.toUpperCase()}
                    </Badge>
                  </div>
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
