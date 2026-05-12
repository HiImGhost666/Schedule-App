import { planningManager } from './planning.manager';
import type {
  AvailabilityItem,
  AvailabilityMatrix,
  CoverageRiskItem,
  PlanningActor,
  PlanningRangeFilters,
} from './planning.types';

export class PlanningService {
  /**
   * Get coverage risks for the planning dashboard.
   */
  async getCoverageRisks(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<CoverageRiskItem[]> {
    const scopedFilters = await planningManager.resolveScopedFilters(filters, actor);
    return planningManager.listCoverageRisks(scopedFilters, actor);
  }

  /**
   * Get employee availability for the planning dashboard.
   */
  async getAvailability(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<AvailabilityItem[]> {
    const scopedFilters = await planningManager.resolveScopedFilters(filters, actor);
    return planningManager.listAvailability(scopedFilters, actor);
  }

  /**
   * Get daily employee availability matrix for the planning dashboard.
   */
  async getAvailabilityMatrix(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<AvailabilityMatrix> {
    const scopedFilters = await planningManager.resolveScopedFilters(filters, actor);
    return planningManager.getAvailabilityMatrix(scopedFilters, actor);
  }
}

export const planningService = new PlanningService();
