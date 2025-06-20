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
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <TrendingUp className="h-6 w-6 text-[#EE001E]" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Larger boxes with 7xl text and scaled elements */}
        <div className="grid grid-cols-4 gap-6">
          <div className="flex flex-col p-6 bg-green-50 rounded-xl border border-green-200 h-40 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="h-6 w-6 text-green-600" />
              <span className="text-base font-medium text-green-800">Additions</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-7xl font-bold text-green-600">
                {summary.additions}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-6 bg-red-50 rounded-xl border border-red-200 h-40 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Minus className="h-6 w-6 text-red-600" />
              <span className="text-base font-medium text-red-800">Deletions</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-7xl font-bold text-red-600">
                {summary.deletions}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-6 bg-orange-50 rounded-xl border border-orange-200 h-40 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Edit className="h-6 w-6 text-orange-600" />
              <span className="text-base font-medium text-orange-800">Modifications</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-7xl font-bold text-orange-600">
                {summary.modifications}
              </span>
            </div>
          </div>

          <div className="flex flex-col p-6 bg-[#F6F0E2] rounded-xl border-2 border-[#EE001E]/20 h-40 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Hash className="h-6 w-6 text-[#EE001E]" />
              <span className="text-base font-semibold text-gray-800">Total Changes</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-7xl font-bold text-[#EE001E]">
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