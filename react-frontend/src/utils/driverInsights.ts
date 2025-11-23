/**
 * Driver Training & Insights Analysis
 * Analyzes telemetry data to provide actionable insights for driver improvement
 */

import { LapEvent, VehicleTelemetry } from '../types/telemetry';

export interface SectorAnalysis {
  sector: number;
  averageTime: number;
  bestTime: number;
  worstTime: number;
  improvement: number;
  consistency: number; // Lower is better (standard deviation)
  recommendation: string;
}

export interface LapAnalysis {
  lapNumber: number;
  lapTime: number;
  sectorTimes: number[];
  topSpeed: number;
  isBestLap: boolean;
  isWorstLap: boolean;
  improvement: number;
}

export interface DriverInsights {
  bestLap: LapEvent | null;
  worstLap: LapEvent | null;
  averageLapTime: number;
  consistency: number;
  sectorAnalysis: SectorAnalysis[];
  trends: {
    improving: boolean;
    lapsToImprove: number[];
    lapsToReview: number[];
  };
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  estimatedPotential: number; // Estimated time that could be gained
}

/**
 * Parse lap time string (e.g., "1:39.725", "1:54.168", or seconds as number) to seconds
 */
function parseLapTime(timeStr: string | number | null | undefined): number | null {
  if (!timeStr && timeStr !== 0) return null;
  
  if (typeof timeStr === 'number') {
    return timeStr;
  }
  
  const str = timeStr.toString().trim();
  
  // Handle format like "1:39.725" or "1:54.168" (MM:SS.mmm)
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 2) {
      const minutes = parseFloat(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    }
  }
  
  // Try parsing as plain number (seconds)
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num;
  }
  
  return null;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Analyze driver performance from lap events
 */
export function analyzeDriverPerformance(
  lapEvents: LapEvent[],
  vehicleId: string
): DriverInsights {
  if (lapEvents.length === 0) {
    return {
      bestLap: null,
      worstLap: null,
      averageLapTime: 0,
      consistency: 0,
      sectorAnalysis: [],
      trends: {
        improving: false,
        lapsToImprove: [],
        lapsToReview: [],
      },
      recommendations: ['No lap data available for analysis'],
      strengths: [],
      weaknesses: [],
      estimatedPotential: 0,
    };
  }

  // Filter valid laps (exclude pit stops and invalid times)
  const validLaps = lapEvents.filter(
    (lap) => !lap.pit && lap.lap_time != null && lap.sector_times.length === 3
  );

  if (validLaps.length === 0) {
    return {
      bestLap: null,
      worstLap: null,
      averageLapTime: 0,
      consistency: 0,
      sectorAnalysis: [],
      trends: {
        improving: false,
        lapsToImprove: [],
        lapsToReview: [],
      },
      recommendations: ['No valid lap data available (all laps may be pit stops)'],
      strengths: [],
      weaknesses: [],
      estimatedPotential: 0,
    };
  }

  // Parse lap times
  const lapTimes = validLaps
    .map((lap) => parseLapTime(lap.lap_time))
    .filter((time): time is number => time !== null);

  // Find best and worst laps
  const bestLapIndex = lapTimes.indexOf(Math.min(...lapTimes));
  const worstLapIndex = lapTimes.indexOf(Math.max(...lapTimes));
  const bestLap = validLaps[bestLapIndex];
  const worstLap = validLaps[worstLapIndex];

  // Calculate averages
  const averageLapTime = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  const consistency = standardDeviation(lapTimes);

  // Analyze sectors
  const sectorAnalysis: SectorAnalysis[] = [1, 2, 3].map((sectorNum) => {
    const sectorIndex = sectorNum - 1;
    const sectorTimes = validLaps
      .map((lap) => lap.sector_times[sectorIndex])
      .filter((time): time is number => time !== null && time !== undefined);

    if (sectorTimes.length === 0) {
      return {
        sector: sectorNum,
        averageTime: 0,
        bestTime: 0,
        worstTime: 0,
        improvement: 0,
        consistency: 0,
        recommendation: 'No data available',
      };
    }

    const avgTime = sectorTimes.reduce((a, b) => a + b, 0) / sectorTimes.length;
    const bestTime = Math.min(...sectorTimes);
    const worstTime = Math.max(...sectorTimes);
    const improvement = worstTime - bestTime;
    const sectorConsistency = standardDeviation(sectorTimes);

    // Generate recommendations
    let recommendation = '';
    if (improvement > 2) {
      recommendation = `High variability detected. Focus on consistency - potential ${improvement.toFixed(2)}s improvement.`;
    } else if (improvement > 1) {
      recommendation = `Moderate variability. Work on finding the optimal line - potential ${improvement.toFixed(2)}s improvement.`;
    } else if (sectorConsistency > 0.5) {
      recommendation = `Good pace but inconsistent. Practice this sector more - potential ${improvement.toFixed(2)}s improvement.`;
    } else {
      recommendation = `Strong and consistent sector. Maintain this performance.`;
    }

    return {
      sector: sectorNum,
      averageTime: avgTime,
      bestTime,
      worstTime,
      improvement,
      consistency: sectorConsistency,
      recommendation,
    };
  });

  // Analyze trends
  const recentLaps = validLaps.slice(-10); // Last 10 laps
  const earlierLaps = validLaps.slice(0, Math.max(0, validLaps.length - 10));
  
  const recentAvg = recentLaps.length > 0
    ? recentLaps
        .map((lap) => parseLapTime(lap.lap_time))
        .filter((time): time is number => time !== null)
        .reduce((a, b) => a + b, 0) / recentLaps.length
    : averageLapTime;
  
  const earlierAvg = earlierLaps.length > 0
    ? earlierLaps
        .map((lap) => parseLapTime(lap.lap_time))
        .filter((time): time is number => time !== null)
        .reduce((a, b) => a + b, 0) / earlierLaps.length
    : averageLapTime;

  const improving = recentAvg < earlierAvg;
  
  // Find laps that are significantly slower than best
  const bestLapTime = Math.min(...lapTimes);
  const lapsToImprove = validLaps
    .map((lap, index) => ({
      lap,
      index: index,
      time: parseLapTime(lap.lap_time),
    }))
    .filter((item): item is { lap: LapEvent; index: number; time: number } => item.time !== null)
    .filter((item) => item.time > bestLapTime + 2) // More than 2 seconds slower
    .map((item) => item.lap.lap);

  // Find laps to review (inconsistent sectors)
  const lapsToReview = validLaps
    .map((lap, index) => {
      const lapTime = parseLapTime(lap.lap_time);
      if (lapTime === null) return null;
      
      const sectorVariance = sectorAnalysis.map((sector, sIdx) => {
        const sectorTime = lap.sector_times[sIdx];
        if (sectorTime === null || sectorTime === undefined) return 0;
        return Math.abs(sectorTime - sectorAnalysis[sIdx].averageTime);
      }).reduce((a, b) => a + b, 0);

      return { lap: lap.lap, variance: sectorVariance };
    })
    .filter((item): item is { lap: number; variance: number } => item !== null)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 5)
    .map((item) => item.lap);

  // Generate recommendations
  const recommendations: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Sector analysis
  const worstSector = sectorAnalysis.reduce((worst, current) =>
    current.improvement > worst.improvement ? current : worst
  );
  const bestSector = sectorAnalysis.reduce((best, current) =>
    current.consistency < best.consistency && current.improvement < best.improvement
      ? current
      : best
  );

  if (worstSector.improvement > 1) {
    recommendations.push(
      `Focus on Sector ${worstSector.sector}: ${worstSector.improvement.toFixed(2)}s potential improvement`
    );
    weaknesses.push(`Sector ${worstSector.sector} - High variability`);
  }

  if (bestSector.consistency < 0.3) {
    strengths.push(`Sector ${bestSector.sector} - Consistent and strong`);
  }

  // Consistency recommendations
  if (consistency > 2) {
    recommendations.push(
      `Improve consistency: Your lap times vary by ${consistency.toFixed(2)}s. Focus on maintaining consistent pace.`
    );
    weaknesses.push('High lap time variability');
  } else if (consistency < 0.5) {
    strengths.push('Excellent consistency');
  }

  // Trend recommendations
  if (improving) {
    recommendations.push('Great progress! You\'re getting faster. Keep up the momentum.');
    strengths.push('Improving pace over time');
  } else if (recentAvg > earlierAvg + 1) {
    recommendations.push('Recent laps are slower. Review your technique and consider taking a break.');
    weaknesses.push('Declining pace');
  }

  // Calculate estimated potential
  const estimatedPotential = sectorAnalysis.reduce((total, sector) => {
    // Estimate 50% of improvement is achievable
    return total + (sector.improvement * 0.5);
  }, 0);

  if (estimatedPotential > 0.5) {
    recommendations.push(
      `Estimated potential improvement: ${estimatedPotential.toFixed(2)}s by optimizing your weakest sectors`
    );
  }

  // Best lap analysis
  if (bestLap && worstLap) {
    const timeDiff = parseLapTime(worstLap.lap_time)! - parseLapTime(bestLap.lap_time)!;
    if (timeDiff > 5) {
      recommendations.push(
        `Study your best lap (Lap ${bestLap.lap}) - it's ${timeDiff.toFixed(2)}s faster than your worst. Identify what made it faster.`
      );
    }
  }

  return {
    bestLap,
    worstLap,
    averageLapTime,
    consistency,
    sectorAnalysis,
    trends: {
      improving,
      lapsToImprove,
      lapsToReview,
    },
    recommendations,
    strengths,
    weaknesses,
    estimatedPotential,
  };
}

/**
 * Compare two laps to identify differences
 */
export function compareLaps(lap1: LapEvent, lap2: LapEvent): {
  timeDifference: number;
  sectorDifferences: number[];
  fasterSectors: number[];
  slowerSectors: number[];
} {
  const time1 = parseLapTime(lap1.lap_time) || 0;
  const time2 = parseLapTime(lap2.lap_time) || 0;
  const timeDifference = time1 - time2;

  const sectorDifferences = [1, 2, 3].map((sector) => {
    const s1 = lap1.sector_times[sector - 1] || 0;
    const s2 = lap2.sector_times[sector - 1] || 0;
    return s1 - s2;
  });

  const fasterSectors = sectorDifferences
    .map((diff, idx) => (diff < 0 ? idx + 1 : null))
    .filter((sector): sector is number => sector !== null);

  const slowerSectors = sectorDifferences
    .map((diff, idx) => (diff > 0 ? idx + 1 : null))
    .filter((sector): sector is number => sector !== null);

  return {
    timeDifference,
    sectorDifferences,
    fasterSectors,
    slowerSectors,
  };
}

