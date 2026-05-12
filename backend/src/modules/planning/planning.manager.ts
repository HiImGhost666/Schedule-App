import type {
  AvailabilityItem,
  AvailabilityMatrix,
  CoverageRiskItem,
  PlanningActor,
  PlanningRangeFilters,
  ScopedPlanningRangeFilters,
} from './planning.types';
import { createAppError } from '../../common/errors/error-catalog';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export class PlanningManager {
  /**
   * Resolve branch scope for planning queries.
   * Admin users can query all branches. Other roles are limited to their own
   * branch plus any visible branches already attached to the actor.
   */
  async resolveScopedFilters(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<ScopedPlanningRangeFilters> {
    if (actor.roleName === 'admin') {
      return {
        ...filters,
        branchIds: filters.branchId ? [filters.branchId] : undefined,
      };
    }

    const visibleBranchIds = unique([
      actor.branchId,
      ...(actor.visibleBranchIds ?? []),
    ].filter((branchId): branchId is string => Boolean(branchId)));

    if (filters.branchId) {
      if (!visibleBranchIds.includes(filters.branchId)) {
        throw createAppError('FORBIDDEN', 'No puedes consultar esa sucursal');
      }

      return { ...filters, branchIds: [filters.branchId] };
    }

    return {
      ...filters,
      branchIds: visibleBranchIds.length > 0 ? visibleBranchIds : ['__none__'],
    };
  }

  /**
   * List coverage risks in the requested planning range.
   */
  async listCoverageRisks(
    _filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<CoverageRiskItem[]> {
    return [];
  }

  /**
   * List employee availability in the requested planning range.
   */
  async listAvailability(
    _filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityItem[]> {
    return [];
  }

  /**
   * Build the daily availability matrix in the requested planning range.
   */
  async getAvailabilityMatrix(
    _filters: ScopedPlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityMatrix> {
    return { days: [], rows: [] };
  }
}

export const planningManager = new PlanningManager();
