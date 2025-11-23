/**
 * Type definitions for analysis and insights features
 */

// Driver Training & Insights
export interface DriverInsight {
  type: 'improvement' | 'strength' | 'warning';
  category: 'racing_line' | 'braking' | 'acceleration' | 'cornering' | 'consistency';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  lap?: number;
  sector?: number;
  metric?: string;
  value?: number;
  recommendation?: string;
}

export interface LapAnalysis {
  lapNumber: number;
  lapTime: number;
  sectorTimes: number[];
  averageSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  averageThrottle: number;
  averageBrake: number;
  racingLineScore: number; // 0-100
  consistencyScore: number; // 0-100
  insights: DriverInsight[];
  gpsData: Array<{ lat: number; lon: number; speed: number; timestamp: string }>;
}

export interface DriverPerformanceReport {
  vehicleId: string;
  totalLaps: number;
  bestLap: number;
  averageLapTime: number;
  consistency: number; // 0-100
  lapAnalyses: LapAnalysis[];
  overallInsights: DriverInsight[];
  strengths: string[];
  improvements: string[];
  racingLineOptimization: {
    sectors: Array<{
      sector: number;
      currentTime: number;
      optimalTime: number;
      improvement: number;
      recommendations: string[];
    }>;
  };
}

// Pre-Event Prediction
export interface QualifyingPrediction {
  vehicleId: string;
  predictedPosition: number;
  predictedTime: number;
  confidence: number; // 0-100
  factors: {
    historicalPerformance: number;
    weatherImpact: number;
    trackConditions: number;
    driverForm: number;
  };
}

export interface RacePacePrediction {
  vehicleId: string;
  predictedAverageLapTime: number;
  predictedBestLapTime: number;
  tireDegradation: {
    lap: number;
    paceLoss: number; // seconds per lap
  }[];
  fuelConsumption: {
    lap: number;
    fuelRemaining: number;
  }[];
  pitWindow: {
    optimalLap: number;
    reason: string;
  }[];
}

export interface TireDegradationModel {
  vehicleId: string;
  compound: string;
  degradationRate: number; // seconds per lap
  optimalLaps: number;
  criticalLaps: number;
  predictedLapTimes: Array<{
    lap: number;
    predictedTime: number;
    confidence: number;
  }>;
}

// Post-Event Analysis
export interface RaceEvent {
  type: 'overtake' | 'pit_stop' | 'incident' | 'fastest_lap' | 'position_change' | 'caution';
  timestamp: string;
  lap: number;
  vehicleId?: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
}

export interface RaceStory {
  raceId: string;
  totalLaps: number;
  duration: string;
  keyMoments: RaceEvent[];
  strategicDecisions: Array<{
    vehicleId: string;
    decision: string;
    lap: number;
    outcome: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  performanceAnalysis: {
    fastestLap: { vehicleId: string; time: number; lap: number };
    mostConsistent: { vehicleId: string; consistency: number };
    bestRecovery: { vehicleId: string; positionsGained: number };
  };
  summary: string;
}

// Real-Time Analytics
export interface PitStopWindow {
  vehicleId: string;
  currentLap: number;
  optimalLap: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  estimatedTimeLoss: number;
  estimatedTimeGain: number;
}

export interface TireCondition {
  vehicleId: string;
  compound: string;
  age: number; // laps
  degradation: number; // 0-100
  predictedLapsRemaining: number;
  recommendation: 'continue' | 'monitor' | 'pit_soon' | 'pit_now';
}

export interface FuelStrategy {
  vehicleId: string;
  currentFuel: number; // percentage
  consumptionRate: number; // per lap
  predictedLapsRemaining: number;
  pitRequired: boolean;
  optimalPitLap: number;
}

export interface CautionAnalysis {
  type: 'full_course_yellow' | 'local_yellow' | 'red_flag';
  affectedSectors: number[];
  impact: {
    vehicleId: string;
    positionChange: number;
    timeGain: number;
    timeLoss: number;
  }[];
  strategicOptions: Array<{
    vehicleId: string;
    option: string;
    pros: string[];
    cons: string[];
    recommendation: boolean;
  }>;
}

export interface RealTimeAnalytics {
  pitStopWindows: PitStopWindow[];
  tireConditions: TireCondition[];
  fuelStrategies: FuelStrategy[];
  cautionAnalysis?: CautionAnalysis;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    vehicleId: string;
    action: string;
    reason: string;
    estimatedImpact: string;
  }>;
}

