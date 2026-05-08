import type { Branch, BranchHoliday, Department } from '@/types';
import { BranchSelector } from './BranchSelector';
import { HolidayLegend } from './HolidayLegend';
import { TypeLegend } from './TypeLegend';

interface ScheduleSidebarProps {
  branches: Branch[];
  activeBranchId: string;
  effectiveActiveBranchId: string;
  canViewAllBranches: boolean;
  onBranchChange: (branchId: string) => void;
  departments?: Department[];
  selectedDeptId: string;
  onDepartmentChange: (departmentId: string) => void;
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
  typeCounts: Record<string, number>;
  holidayTypeCounts: Partial<Record<BranchHoliday['type'], number>>;
}

export function ScheduleSidebar({
  branches, activeBranchId, effectiveActiveBranchId, canViewAllBranches, onBranchChange,
  departments, selectedDeptId, onDepartmentChange, hiddenTypes, onToggleType, typeCounts, holidayTypeCounts,
}: ScheduleSidebarProps) {
  return (
    <aside className="border-b border-theme-color lg:border-b-0 lg:border-r">
      <BranchSelector
        branches={branches}
        activeBranchId={activeBranchId}
        effectiveActiveBranchId={effectiveActiveBranchId}
        canViewAllBranches={canViewAllBranches}
        onChange={onBranchChange}
        departments={departments}
        selectedDeptId={selectedDeptId}
        onDepartmentChange={onDepartmentChange}
      />

      <TypeLegend hidden={hiddenTypes} onToggle={onToggleType} counts={typeCounts} />

      <HolidayLegend holidayTypeCounts={holidayTypeCounts} />
    </aside>
  );
}
