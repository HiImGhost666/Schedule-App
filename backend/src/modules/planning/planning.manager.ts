import type {
  AvailabilityItem,
  AvailabilityMatrix,
  CoverageRiskItem,
  PlanningActor,
  PlanningRangeFilters,
} from './planning.types';

export class PlanningManager {
  /**
   * List coverage risks in the requested planning range.
   */
  async listCoverageRisks(
    _filters: PlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<CoverageRiskItem[]> {
    return [];
  }

  /**
   * List employee availability in the requested planning range.
   */
  async listAvailability(
    _filters: PlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityItem[]> {
    return [];
  }

  /**
   * Build the daily availability matrix in the requested planning range.
   */
  async getAvailabilityMatrix(
    _filters: PlanningRangeFilters,
    _actor: PlanningActor,
  ): Promise<AvailabilityMatrix> {
    return { days: [], rows: [] };
  }
}

export const planningManager = new PlanningManager();
