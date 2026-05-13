import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanningPage } from '@/pages/admin/PlanningPage';

vi.mock('@/components/planning/PlanningFilters', () => ({
  PlanningFilters: () => <div data-testid="planning-filters" />,
}));
vi.mock('@/components/planning/PlanningSummaryCards', () => ({
  PlanningSummaryCards: () => <div data-testid="planning-summary" />,
}));
vi.mock('@/components/planning/PlanningMatrix', () => ({
  PlanningMatrix: () => <div data-testid="planning-matrix" />,
}));
vi.mock('@/components/planning/PlanningSidePanels', () => ({
  PlanningSidePanels: () => <div data-testid="planning-sidepanels" />,
}));

vi.mock('@/hooks/usePlanning', () => ({
  usePlanningLookups: () => ({ isLoading: false, data: { branches: [], departments: [], skills: [] } }),
  useCoverageRisks: () => ({ isError: false, data: [] }),
  useAvailability: () => ({ isError: false, data: [] }),
  useSubstitutes: () => ({ data: [] }),
  useAvailabilityMatrix: () => ({ isLoading: false, isError: false, data: { days: [], rows: [] } }),
  useEquity: () => ({ data: [] }),
  useTimeline: () => ({ data: [] }),
  useCrisisMode: () => ({ data: { highRisks: [] } }),
  useTemplatePreview: () => ({ data: [] }),
  useSupportRequests: () => ({ data: [] }),
  useNotificationPreferences: () => ({ data: null }),
  useCreateSupportRequest: () => ({ mutate: vi.fn() }),
  useReviewSupportRequest: () => ({ mutate: vi.fn() }),
  useUpdateNotificationPreferences: () => ({ mutate: vi.fn() }),
}));

describe('PlanningPage smoke', () => {
  it('renders base planning layout', () => {
    render(<PlanningPage />);

    expect(screen.getByText('Planificación Operativa')).toBeInTheDocument();
    expect(screen.getByTestId('planning-filters')).toBeInTheDocument();
    expect(screen.getByTestId('planning-summary')).toBeInTheDocument();
    expect(screen.getByTestId('planning-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('planning-sidepanels')).toBeInTheDocument();
  });
});
