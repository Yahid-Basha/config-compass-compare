import React from 'react';
import { Plus, Minus, Edit, TrendingUp, Hash } from 'lucide-react';
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

  return (
    <Card className="border-l-4 border-l-[#EE001E]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-[#EE001E]" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Square boxes arranged horizontally */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200 aspect-square">
            <Plus className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Additions</span>
            <Badge className="bg-green-600 text-white mt-1">
              {summary.additions}
            </Badge>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg border border-red-200 aspect-square">
            <Minus className="h-6 w-6 text-red-600 mb-2" />
            <span className="text-sm font-medium text-red-800">Deletions</span>
            <Badge className="bg-red-600 text-white mt-1">
              {summary.deletions}
            </Badge>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg border border-orange-200 aspect-square">
            <Edit className="h-6 w-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">Modifications</span>
            <Badge className="bg-orange-600 text-white mt-1">
              {summary.modifications}
            </Badge>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-[#F6F0E2] rounded-lg border-2 border-[#EE001E]/20 aspect-square">
            <Hash className="h-6 w-6 text-[#EE001E] mb-2" />
            <span className="text-sm font-semibold text-gray-800">Total Changes</span>
            <Badge className="bg-[#EE001E] text-white text-lg px-3 py-1 mt-1">
              {totalChanges}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryPanel;