import { useTelemetryStore } from '../store/telemetryStore';
import { analyzeDriverPerformance, compareLaps } from '../utils/driverInsights';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, Award, BarChart3 } from 'lucide-react';
import { useState } from 'react';

export function DriverInsights() {
  const { lapEvents, selectedVehicleId } = useTelemetryStore();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sectors' | 'trends'>('overview');

  if (!selectedVehicleId) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
        <div className="text-sm text-gray-400">Select a vehicle to view driver insights</div>
      </div>
    );
  }

  const vehicleLaps = lapEvents[selectedVehicleId] || [];
  const insights = analyzeDriverPerformance(vehicleLaps, selectedVehicleId);

  if (vehicleLaps.length === 0) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4">
        <div className="text-sm text-gray-400">No lap data available for analysis</div>
      </div>
    );
  }

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
  };

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold">Driver Training & Insights</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            selectedTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('sectors')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            selectedTab === 'sectors'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Sector Analysis
        </button>
        <button
          onClick={() => setSelectedTab('trends')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            selectedTab === 'trends'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Trends
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Best Lap</div>
              <div className="text-lg font-bold text-green-400">
                {insights.bestLap ? formatTime(insights.bestLap.lap_time) : 'N/A'}
              </div>
              {insights.bestLap && (
                <div className="text-xs text-gray-500 mt-1">Lap {insights.bestLap.lap}</div>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Average Lap</div>
              <div className="text-lg font-bold text-blue-400">
                {formatTime(insights.averageLapTime)}
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Consistency</div>
              <div className="text-lg font-bold text-yellow-400">
                {insights.consistency.toFixed(2)}s
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {insights.consistency < 0.5 ? 'Excellent' : insights.consistency < 1 ? 'Good' : 'Needs Work'}
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Potential Gain</div>
              <div className="text-lg font-bold text-purple-400">
                {insights.estimatedPotential.toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900 bg-opacity-30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-400" />
                <h4 className="text-sm font-semibold text-green-400">Strengths</h4>
              </div>
              {insights.strengths.length > 0 ? (
                <ul className="space-y-1 text-xs text-gray-300">
                  {insights.strengths.map((strength, idx) => (
                    <li key={idx}>• {strength}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">No significant strengths identified</div>
              )}
            </div>
            <div className="bg-red-900 bg-opacity-30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-400" />
                <h4 className="text-sm font-semibold text-red-400">Areas to Improve</h4>
              </div>
              {insights.weaknesses.length > 0 ? (
                <ul className="space-y-1 text-xs text-gray-300">
                  {insights.weaknesses.map((weakness, idx) => (
                    <li key={idx}>• {weakness}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">No major weaknesses identified</div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-blue-400" />
              <h4 className="text-sm font-semibold text-blue-400">Recommendations</h4>
            </div>
            <ul className="space-y-2 text-xs text-gray-300">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sector Analysis Tab */}
      {selectedTab === 'sectors' && (
        <div className="space-y-4">
          {insights.sectorAnalysis.map((sector) => (
            <div key={sector.sector} className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold">Sector {sector.sector}</h4>
                <div className="flex items-center gap-2">
                  {sector.consistency < 0.3 ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <AlertCircle size={16} className="text-yellow-400" />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Best</div>
                  <div className="text-sm font-bold text-green-400">
                    {formatTime(sector.bestTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Average</div>
                  <div className="text-sm font-bold text-blue-400">
                    {formatTime(sector.averageTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Worst</div>
                  <div className="text-sm font-bold text-red-400">
                    {formatTime(sector.worstTime)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded p-2 mb-3">
                <div className="text-xs text-gray-400 mb-1">Improvement Potential</div>
                <div className="text-sm font-semibold text-purple-400">
                  {sector.improvement.toFixed(2)}s
                </div>
              </div>

              <div className="text-xs text-gray-300 bg-gray-800 rounded p-2">
                {sector.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trends Tab */}
      {selectedTab === 'trends' && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              {insights.trends.improving ? (
                <TrendingUp size={20} className="text-green-400" />
              ) : (
                <TrendingDown size={20} className="text-red-400" />
              )}
              <h4 className="text-md font-semibold">Performance Trend</h4>
            </div>
            <div className="text-sm text-gray-300">
              {insights.trends.improving
                ? 'Your recent laps are faster than earlier laps. Great progress!'
                : 'Your recent laps are slower than earlier laps. Consider reviewing your technique.'}
            </div>
          </div>

          {insights.trends.lapsToImprove.length > 0 && (
            <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-yellow-400" />
                <h4 className="text-sm font-semibold text-yellow-400">Laps to Improve</h4>
              </div>
              <div className="text-xs text-gray-300">
                These laps are significantly slower than your best. Review them to identify issues:
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {insights.trends.lapsToImprove.slice(0, 10).map((lap) => (
                  <span
                    key={lap}
                    className="px-2 py-1 bg-yellow-900 bg-opacity-50 rounded text-xs"
                  >
                    Lap {lap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insights.trends.lapsToReview.length > 0 && (
            <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-blue-400" />
                <h4 className="text-sm font-semibold text-blue-400">Laps to Review</h4>
              </div>
              <div className="text-xs text-gray-300">
                These laps show inconsistent sector performance. Study them to understand variations:
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {insights.trends.lapsToReview.map((lap) => (
                  <span
                    key={lap}
                    className="px-2 py-1 bg-blue-900 bg-opacity-50 rounded text-xs"
                  >
                    Lap {lap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insights.bestLap && insights.worstLap && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-md font-semibold mb-3">Best vs Worst Lap Comparison</h4>
              {(() => {
                const comparison = compareLaps(insights.worstLap, insights.bestLap);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Difference:</span>
                      <span className="font-bold text-green-400">
                        {comparison.timeDifference.toFixed(2)}s faster
                      </span>
                    </div>
                    {comparison.fasterSectors.length > 0 && (
                      <div>
                        <span className="text-gray-400">Faster Sectors in Best Lap: </span>
                        <span className="text-green-400">
                          {comparison.fasterSectors.join(', ')}
                        </span>
                      </div>
                    )}
                    {comparison.slowerSectors.length > 0 && (
                      <div>
                        <span className="text-gray-400">Slower Sectors in Best Lap: </span>
                        <span className="text-red-400">
                          {comparison.slowerSectors.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

