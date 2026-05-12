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
    return planningManager.listCoverageRisks(filters, actor);
  }

  /**
   * Get employee availability for the planning dashboard.
   */
  async getAvailability(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<AvailabilityItem[]> {
    return planningManager.listAvailability(filters, actor);
  }

  /**
   * Get daily employee availability matrix for the planning dashboard.
   */
  async getAvailabilityMatrix(
    filters: PlanningRangeFilters,
    actor: PlanningActor,
  ): Promise<AvailabilityMatrix> {
    return planningManager.getAvailabilityMatrix(filters, actor);
  }
}

export const planningService = new PlanningService();
