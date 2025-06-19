
import React from 'react';
import { Plus, Minus, Edit, TrendingUp, FileText, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Change {
  path: string;
  change_type: 'addition' | 'deletion' | 'modification';
  old_value?: any;
  new_value?: any;
}

interface Summary {
  additions: number;
  deletions: number;
  modifications: number;
}

interface SummaryPanelProps {
  summary: Summary;
  changes: Change[];
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary, changes }) => {
  const totalChanges = summary.additions + summary.deletions + summary.modifications;

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'addition':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'deletion':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modification':
        return <Edit className="h-4 w-4 text-orange-600" />;
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
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card className="border-l-4 border-l-[#EE001E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-[#EE001E]" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Additions</span>
              </div>
              <Badge className="bg-green-600 text-white">
                {summary.additions}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Deletions</span>
              </div>
              <Badge className="bg-red-600 text-white">
                {summary.deletions}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Modifications</span>
              </div>
              <Badge className="bg-orange-600 text-white">
                {summary.modifications}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 bg-[#F6F0E2] rounded-lg border-2 border-[#EE001E]/20">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#EE001E]" />
              <span className="font-semibold text-gray-800">Total Changes</span>
            </div>
            <Badge className="bg-[#EE001E] text-white text-lg px-3 py-1">
              {totalChanges}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Change Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {changes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No changes detected</p>
            ) : (
              changes.map((change, index) => (
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryPanel;
