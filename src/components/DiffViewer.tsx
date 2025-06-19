import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DiffViewerProps {
  sourceLines: string[];
  targetLines: string[];
  format: 'json' | 'xml' | 'yaml';
}

const DiffViewer: React.FC<DiffViewerProps> = ({ sourceLines, targetLines, format }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSide, setSelectedSide] = useState<'source' | 'target' | 'both'>('both');

  const getLineType = (line: string): 'added' | 'removed' | 'changed' | 'normal' => {
    if (line.startsWith('+') && !line.startsWith('++')) return 'added';
    if (line.startsWith('-') && !line.startsWith('--')) return 'removed';
    if (line.startsWith('~') || line.includes('→')) return 'changed';
    return 'normal';
  };

  const getLineStyles = (type: 'added' | 'removed' | 'changed' | 'normal'): string => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-500 text-green-800';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-500 text-red-800';
      case 'changed':
        return 'bg-orange-50 border-l-4 border-orange-500 text-orange-800';
      default:
        return 'bg-gray-50 border-l-4 border-transparent';
    }
  };

  const extractKey = (line: string): string | null => {
    // Remove diff prefixes first
    const cleanLine = line.replace(/^[+-~]\s*/, '').trim();
    
    if (format === 'json') {
      const match = cleanLine.match(/"([^"]+)"\s*:/);
      return match ? match[1] : null;
    } else if (format === 'yaml') {
      const match = cleanLine.match(/^(\s*)([^:]+):/);
      return match ? match[2].trim() : null;
    } else if (format === 'xml') {
      const match = cleanLine.match(/<([^>\s/]+)(?:\s|>)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const extractValue = (line: string): string | null => {
    const cleanLine = line.replace(/^[+-~]\s*/, '').trim();
    
    if (format === 'json') {
      const match = cleanLine.match(/"[^"]+"\s*:\s*(.+?)(?:,\s*$|$)/);
      return match ? match[1].trim() : null;
    } else if (format === 'yaml') {
      const match = cleanLine.match(/^(\s*)[^:]+:\s*(.+?)(?:\s*$)/);
      return match ? match[2].trim() : null;
    } else if (format === 'xml') {
      const match = cleanLine.match(/>([^<]+)</);
      return match ? match[1].trim() : null;
    }
    return null;
  };

  const processLinesForModifications = (lines: string[]) => {
    const processedLines: string[] = [];
    const removedLines: { index: number; line: string; key: string | null; value: string | null }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      
      if (currentLine.startsWith('-') && !currentLine.startsWith('--')) {
        // Store removed line for potential modification detection
        const key = extractKey(currentLine);
        const value = extractValue(currentLine);
        removedLines.push({ index: i, line: currentLine, key, value });
        continue;
      }
      
      if (currentLine.startsWith('+') && !currentLine.startsWith('++')) {
        // Check if this addition matches a recent removal (modification)
        const addedKey = extractKey(currentLine);
        const addedValue = extractValue(currentLine);
        
        // Look for a matching removed line with same key but different value
        const matchingRemovedIndex = removedLines.findIndex(removed => 
          removed.key && addedKey && 
          removed.key === addedKey && 
          removed.value !== addedValue
        );
        
        if (matchingRemovedIndex !== -1) {
          // Found a modification - replace the removed line with a changed line
          const removedLine = removedLines[matchingRemovedIndex];
          const modifiedLine = `~ ${currentLine.substring(1)} (was: ${removedLine.value})`;
          processedLines.push(modifiedLine);
          removedLines.splice(matchingRemovedIndex, 1);
        } else {
          // Add any remaining removed lines that didn't match
          removedLines.forEach(removed => processedLines.push(removed.line));
          removedLines.length = 0;
          processedLines.push(currentLine);
        }
      } else {
        // Add any remaining removed lines that didn't match
        removedLines.forEach(removed => processedLines.push(removed.line));
        removedLines.length = 0;
        processedLines.push(currentLine);
      }
    }
    
    // Add any remaining removed lines
    removedLines.forEach(removed => processedLines.push(removed.line));
    
    return processedLines;
  };

  const copyToClipboard = (content: string[], side: string) => {
    const text = content.join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${side} content copied to clipboard!`);
  };

  const renderCodeLines = (lines: string[], title: string, side: 'source' | 'target') => {
    if (selectedSide !== 'both' && selectedSide !== side) return null;

    const processedLines = processLinesForModifications(lines);
    const changeCount = processedLines.filter(line => getLineType(line) !== 'normal').length;

    return (
      <div className={`${selectedSide === 'both' ? 'w-1/2' : 'w-full'} ${selectedSide === 'both' ? 'pr-2' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{title}</h3>
            <Badge variant="outline" className="text-xs">
              {processedLines.length} lines
            </Badge>
            {changeCount > 0 && (
              <Badge className="bg-[#EE001E] text-white text-xs">
                {changeCount} changes
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(processedLines, title)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <pre className="text-sm">
              {processedLines.map((line, index) => {
                const lineType = getLineType(line);
                let cleanLine = line;
                
                // Clean the line based on type and format
                if (lineType === 'added') {
                  cleanLine = line.substring(1).trim();
                } else if (lineType === 'removed') {
                  cleanLine = line.substring(1).trim();
                } else if (lineType === 'changed') {
                  cleanLine = line.substring(1).trim();
                }
                
                return (
                  <div
                    key={index}
                    className={`px-4 py-1 flex ${getLineStyles(lineType)}`}
                  >
                    <span className="w-12 text-xs text-gray-400 flex-shrink-0 select-none">
                      {index + 1}
                    </span>
                    <code className="flex-1 font-mono whitespace-pre-wrap break-all">
                      {cleanLine}
                    </code>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Visual Diff Viewer
            <Badge variant="outline" className="ml-2">
              {format.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={selectedSide === 'source' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSide('source')}
                className="text-xs px-3"
              >
                Source Only
              </Button>
              <Button
                variant={selectedSide === 'both' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSide('both')}
                className="text-xs px-3"
              >
                Side by Side
              </Button>
              <Button
                variant={selectedSide === 'target' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSide('target')}
                className="text-xs px-3"
              >
                Target Only
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 border border-red-400 rounded"></div>
              <span>Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-200 border border-orange-400 rounded"></div>
              <span>Modified</span>
            </div>
          </div>

          <div className="flex gap-4">
            {renderCodeLines(sourceLines, 'Source File', 'source')}
            {renderCodeLines(targetLines, 'Target File', 'target')}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DiffViewer;
