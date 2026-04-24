import type { Branch, BranchHoliday } from '@/types';
import { BranchSelector } from './BranchSelector';
import { HolidayLegend } from './HolidayLegend';
import { TypeLegend } from './TypeLegend';

interface ScheduleSidebarProps {
  branches: Branch[];
  activeBranchId: string;
  effectiveActiveBranchId: string;
  canViewAllBranches: boolean;
  onBranchChange: (branchId: string) => void;
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
  typeCounts: Record<string, number>;
  holidayTypeCounts: Partial<Record<BranchHoliday['type'], number>>;
}

export function ScheduleSidebar({
  branches, activeBranchId, effectiveActiveBranchId, canViewAllBranches, onBranchChange,
  hiddenTypes, onToggleType, typeCounts, holidayTypeCounts,
}: ScheduleSidebarProps) {
  return (
    <aside className="border-b border-theme-color lg:border-b-0 lg:border-r">
      <BranchSelector
        branches={branches}
        activeBranchId={activeBranchId}
        effectiveActiveBranchId={effectiveActiveBranchId}
        canViewAllBranches={canViewAllBranches}
        onChange={onBranchChange}
      />

      {effectiveActiveBranchId && <HolidayLegend holidayTypeCounts={holidayTypeCounts} />}

      <TypeLegend hidden={hiddenTypes} onToggle={onToggleType} counts={typeCounts} />
    </aside>
  );
}
