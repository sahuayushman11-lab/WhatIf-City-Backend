import { SimulationResult, ScenarioComparisonOutput, KPIDifference, TradeOffNote } from '../models/types.js';

export type ComparisonObjective = 'minimize_delay' | 'minimize_queue' | 'prioritize_pedestrians' | 'balanced';

export class ScenarioComparisonEngine {
  /**
   * Safely calculates percentage change, handling zero denominator
   */
  static calculatePercentageChange(baseline: number, plan: number): number | null {
    if (baseline === 0) {
      return null; // Undefined / N/A
    }
    const change = ((plan - baseline) / baseline) * 100;
    return Number(change.toFixed(1));
  }

  /**
   * Compares two sets of KPIs and marks whether changes are improvements
   */
  static compareKPIs(baseline: SimulationResult, plan: SimulationResult): KPIDifference[] {
    const bKpi = baseline.kpis;
    const pKpi = plan.kpis;

    const metricsConfig: Array<{
      key: keyof typeof bKpi;
      label: string;
      unit: string;
      preferred: 'lower' | 'higher';
    }> = [
      { key: 'avgDelayPerVehicleSeconds', label: 'Average Vehicle Delay', unit: 's/veh', preferred: 'lower' },
      { key: 'maxQueueLength', label: 'Maximum Queue Length', unit: 'vehicles', preferred: 'lower' },
      { key: 'avgQueueLength', label: 'Average Queue Length', unit: 'vehicles', preferred: 'lower' },
      { key: 'totalDepartures', label: 'Vehicles Served (Departures)', unit: 'vehicles', preferred: 'higher' },
      { key: 'remainingQueue', label: 'Remaining Unserved Queue', unit: 'vehicles', preferred: 'lower' },
      { key: 'throughputPerHour', label: 'Hourly Throughput', unit: 'veh/hr', preferred: 'higher' },
      { key: 'pedestrianWaitAvgSeconds', label: 'Pedestrian Red Wait', unit: 's', preferred: 'lower' },
    ];

    return metricsConfig.map((m) => {
      const bVal = Number(bKpi[m.key] ?? 0);
      const pVal = Number(pKpi[m.key] ?? 0);
      const absoluteChange = Number((pVal - bVal).toFixed(1));
      const percentageChange = this.calculatePercentageChange(bVal, pVal);

      let isImprovement = false;
      if (m.preferred === 'lower') {
        isImprovement = pVal < bVal;
      } else {
        isImprovement = pVal > bVal;
      }

      return {
        metricKey: m.key,
        metricLabel: m.label,
        baselineValue: bVal,
        planValue: pVal,
        absoluteChange,
        percentageChange,
        preferredDirection: m.preferred,
        isImprovement,
        unit: m.unit,
      };
    });
  }

  /**
   * Identifies qualitative and quantitative trade-offs between Baseline, Plan A, and Plan B
   */
  static identifyTradeOffs(baseline: SimulationResult, planA: SimulationResult, planB: SimulationResult): TradeOffNote[] {
    const tradeOffs: TradeOffNote[] = [];

    // Vehicular flow vs Pedestrian wait
    const aDelayChange = (planA.kpis.avgDelayPerVehicleSeconds - baseline.kpis.avgDelayPerVehicleSeconds);
    const bDelayChange = (planB.kpis.avgDelayPerVehicleSeconds - baseline.kpis.avgDelayPerVehicleSeconds);

    if (planA.kpis.avgDelayPerVehicleSeconds < baseline.kpis.avgDelayPerVehicleSeconds) {
      tradeOffs.push({
        dimension: 'Vehicular Delay Reduction',
        winner: planA.scenarioName,
        description: `${planA.scenarioName} lowers vehicle delay by ${Math.abs(aDelayChange).toFixed(1)}s compared to Baseline.`,
        severity: 'positive',
      });
    }

    if (planB.parameters.exclusivePedestrianPhase) {
      tradeOffs.push({
        dimension: 'Pedestrian Crossing Safety',
        winner: planB.scenarioName,
        description: `${planB.scenarioName} includes an exclusive pedestrian phase, eliminating vehicle-pedestrian turning conflicts during walk cycles.`,
        severity: 'positive',
      });
    }

    if (planA.kpis.maxQueueLength > planB.kpis.maxQueueLength) {
      tradeOffs.push({
        dimension: 'Queue Shockwave Resistance',
        winner: planB.scenarioName,
        description: `${planB.scenarioName} maintains a shorter peak queue (${planB.kpis.maxQueueLength} vs ${planA.kpis.maxQueueLength} veh), reducing risk of spillback to upstream intersections.`,
        severity: 'neutral',
      });
    }

    // Capacity warning trade-off
    if (planA.kpis.degreeOfSaturation > 0.95 || planB.kpis.degreeOfSaturation > 0.95) {
      tradeOffs.push({
        dimension: 'Volume-to-Capacity Resilience',
        winner: 'Caution Advised',
        description: 'Degree of saturation is near or exceeds critical capacity (>0.95). Any minor surge in arrivals will create exponential queue growth.',
        severity: 'warning',
      });
    }

    return tradeOffs;
  }

  /**
   * Computes multi-objective composite scores based on disclosed user weights
   */
  static evaluateObjectives(
    baseline: SimulationResult,
    planA: SimulationResult,
    planB: SimulationResult,
    objective: ComparisonObjective = 'balanced'
  ) {
    let weights: Record<string, number>;
    let explanation = '';

    switch (objective) {
      case 'minimize_delay':
        weights = { delay: 0.7, queue: 0.2, pedestrian: 0.1 };
        explanation = 'Prioritizes rapid vehicular clearing with 70% weight on average delay.';
        break;
      case 'minimize_queue':
        weights = { delay: 0.2, queue: 0.7, pedestrian: 0.1 };
        explanation = 'Focuses on stopping queue spillback and storage lane overflow.';
        break;
      case 'prioritize_pedestrians':
        weights = { delay: 0.2, queue: 0.2, pedestrian: 0.6 };
        explanation = 'Elevates student pedestrian safety, dedicated crossing phases, and minimal pedestrian wait time.';
        break;
      case 'balanced':
      default:
        weights = { delay: 0.4, queue: 0.3, pedestrian: 0.3 };
        explanation = 'Balanced campus weighting harmonizing vehicular throughput with pedestrian access.';
        break;
    }

    // Helper to calculate normalized penalty score (lower is better, converted to 0-100 scale where 100 is best)
    const calcScore = (res: SimulationResult) => {
      const delayPenalty = Math.min(100, (res.kpis.avgDelayPerVehicleSeconds / 100) * 100);
      const queuePenalty = Math.min(100, (res.kpis.maxQueueLength / 60) * 100);
      const pedPenalty = Math.min(100, ((res.kpis.pedestrianWaitAvgSeconds ?? 45) / 90) * 100);

      // Raw penalty 0-100
      const rawPenalty = delayPenalty * weights.delay + queuePenalty * weights.queue + pedPenalty * weights.pedestrian;
      const score = Math.max(5, Math.round(100 - rawPenalty));
      return score;
    };

    return {
      objective,
      weightsDisclosed: weights,
      scores: {
        baseline: calcScore(baseline),
        planA: calcScore(planA),
        planB: calcScore(planB),
      },
      explanation,
    };
  }

  /**
   * Full comparison runner
   */
  static compare(
    baseline: SimulationResult,
    planA: SimulationResult,
    planB: SimulationResult,
    objective: ComparisonObjective = 'balanced'
  ): ScenarioComparisonOutput {
    const differencesPlanA = this.compareKPIs(baseline, planA);
    const differencesPlanB = this.compareKPIs(baseline, planB);
    const tradeOffs = this.identifyTradeOffs(baseline, planA, planB);
    const objectiveScores = this.evaluateObjectives(baseline, planA, planB, objective);

    return {
      baseline,
      planA,
      planB,
      differencesPlanA,
      differencesPlanB,
      tradeOffs,
      objectiveScores,
      disclaimer:
        'Notice: Simulation outcomes are comparative estimates computed from simplified macroscopic queue assumptions. They do not constitute certified engineering plans or replace statutory safety audits.',
    };
  }
}
