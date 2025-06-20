import React from 'react';
import { Plus, Minus, Edit, TrendingUp, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  return (
    <Card className="border-l-4 border-l-[#EE001E]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-[#EE001E]" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Medium-sized square boxes arranged horizontally */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col p-3 bg-green-50 rounded-lg border border-green-200 h-24 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Additions</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-3xl font-bold text-green-600">
                {summary.additions}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-3 bg-red-50 rounded-lg border border-red-200 h-24 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Deletions</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-3xl font-bold text-red-600">
                {summary.deletions}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-3 bg-orange-50 rounded-lg border border-orange-200 h-24 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Modifications</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-3xl font-bold text-orange-600">
                {summary.modifications}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-3 bg-[#F6F0E2] rounded-lg border-2 border-[#EE001E]/20 h-24 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-[#EE001E]" />
              <span className="text-sm font-semibold text-gray-800">Total Changes</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-3xl font-bold text-[#EE001E]">
                {totalChanges}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryPanel;