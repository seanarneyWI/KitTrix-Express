# Y/Ŷ Statistical Model Architecture
## KitTrix Express - Production Forecasting & Residual Analysis Framework

**Created**: November 6, 2025
**Purpose**: Define the statistical foundation for scenario planning and data-driven schedule optimization

---

## Core Concept: Regression Model for Production Scheduling

### The Statistical Analogy

KitTrix Express uses a **regression/forecasting model** where:

- **Y (Production Reality)** = Actual production schedule as executed
- **Ŷ (Y-hat, Scenarios)** = Predicted/forecasted schedule alternatives
- **Residuals (Y - Ŷ)** = Differences between predicted and actual outcomes
- **Model Improvement** = As more production data accumulates, predictions become more accurate

### Terminology Origin

**"What-Y-f"** → **"What-if"** → **Y Scenarios**

The Y terminology comes from shortening "What-if" while maintaining the statistical regression concept where:
- Y represents the dependent variable (actual outcomes)
- Ŷ (Y-hat) represents predicted values from regression models
- Multiple Ŷ values represent multiple prediction models/scenarios

This is intentionally analogous to **regression analysis** where you compare actual observations (Y) against model predictions (Ŷ) to evaluate model performance and improve forecasting.

---

## System Architecture

### Current State (November 2025)

#### Production Layer (Y)
```typescript
// Reality - what actually happened or is happening
interface ProductionJob {
  id: string;
  scheduledDate: DateTime;          // Planned start
  actualStartTime?: DateTime;        // When it really started
  actualEndTime?: DateTime;          // When it really finished
  expectedJobDuration: number;       // Predicted duration (seconds)
  actualDuration?: number;           // Actual duration (seconds)
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  // ... other fields
}
```

**Current Storage**: `kitting_jobs` table in PostgreSQL

#### Scenario Layer (Ŷ)
```typescript
// Predictions - what we think will happen under different conditions
interface Scenario {
  id: string;
  name: string;                      // Human-readable identifier
  description?: string;              // What makes this prediction unique
  createdAt: DateTime;
  changes: ScenarioChange[];         // Modifications to Y (production)
  delays: JobDelay[];                // Injected delays for modeling
}

interface ScenarioChange {
  id: string;
  scenarioId: string;
  jobId: string;
  operation: 'ADD' | 'MODIFY' | 'DELETE';
  changeData: JSONB;                 // Predicted modifications
  originalData: JSONB;               // Original Y values for comparison
}
```

**Current Storage**: `scenarios` and `scenario_changes` tables

### Visual Representation

```
Calendar View:
┌─────────────────────────────────────────────────────────────┐
│ Production Jobs (Y - Reality)                               │
│   [Job 2501] [Job 2502] [Job 2503]  ← Solid, 100% opacity  │
│                                                              │
│ Scenario Overlays (Ŷ - Predictions)                         │
│   [Job 2501]̂ [Job 2502]̂ [Job 2504]̂  ← Purple ghosts, 40%   │
│    🔮 Scenario: Equipment Delays                            │
│                                                              │
│ What-If Modifications (X-axis)                              │
│   [Job 2503]✏️ ← Yellow border, modified in active mode     │
└─────────────────────────────────────────────────────────────┘
```

---

## Residual Analysis Framework

### What Are Residuals?

**Residuals = Y - Ŷ** (Actual minus Predicted)

In production scheduling context:
- **Duration Residual**: Actual job duration - Predicted job duration
- **Schedule Residual**: Actual start time - Predicted start time
- **Completion Residual**: Actual completion - Predicted completion
- **Resource Residual**: Actual resource usage - Predicted resource usage

### Why Track Residuals?

1. **Model Accuracy**: Measure how well scenarios predict reality
2. **Pattern Recognition**: Identify systematic over/under-estimation
3. **Continuous Improvement**: Adjust future predictions based on historical errors
4. **Decision Support**: Choose scenarios with historically better prediction accuracy
5. **Risk Assessment**: Quantify uncertainty in schedule forecasts

### Residual Types to Track

#### 1. Duration Residuals
```typescript
interface DurationResidual {
  jobId: string;
  scenarioId?: string;               // NULL for production baseline
  expectedDuration: number;          // Ŷ predicted seconds
  actualDuration: number;            // Y actual seconds
  residual: number;                  // Y - Ŷ (positive = took longer)
  residualPercentage: number;        // (Y - Ŷ) / Ŷ * 100
  timestamp: DateTime;
}
```

**Examples**:
- Residual = +1800 (30 minutes longer than predicted)
- Residual = -600 (10 minutes faster than predicted)
- Residual = 0 (perfect prediction)

#### 2. Schedule Residuals
```typescript
interface ScheduleResidual {
  jobId: string;
  scenarioId?: string;
  predictedStartTime: DateTime;      // Ŷ when we thought it would start
  actualStartTime: DateTime;         // Y when it really started
  residualMinutes: number;           // Difference in minutes
  rootCause?: string;                // Why did it differ?
  timestamp: DateTime;
}
```

#### 3. Shift Utilization Residuals
```typescript
interface ShiftUtilizationResidual {
  shiftId: string;
  date: Date;
  scenarioId?: string;
  predictedUtilization: number;      // Ŷ (0-1, percentage as decimal)
  actualUtilization: number;         // Y (0-1, percentage as decimal)
  residual: number;                  // Y - Ŷ
  timestamp: DateTime;
}
```

#### 4. Delay Impact Residuals
```typescript
interface DelayImpactResidual {
  delayId: string;                   // The injected delay in scenario
  scenarioId: string;
  jobId: string;
  predictedImpact: number;           // Ŷ how much delay would affect schedule
  actualImpact: number;              // Y actual impact after execution
  residual: number;                  // Y - Ŷ
  timestamp: DateTime;
}
```

---

## Database Schema Design

### New Tables for Residual Tracking

#### `job_execution_history` (Y - Reality)
```sql
CREATE TABLE job_execution_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES kitting_jobs(id) ON DELETE CASCADE,

  -- Predicted values (from job at execution time)
  predicted_start_time TIMESTAMP WITH TIME ZONE,
  predicted_end_time TIMESTAMP WITH TIME ZONE,
  predicted_duration INTEGER,  -- seconds

  -- Actual values (what really happened)
  actual_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  actual_duration INTEGER,     -- seconds

  -- Metadata
  completed_kits INTEGER DEFAULT 0,
  target_kits INTEGER,
  stations_used INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress',  -- in_progress, completed, cancelled

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_execution_history_job_id ON job_execution_history(job_id);
CREATE INDEX idx_job_execution_history_actual_start ON job_execution_history(actual_start_time);
```

#### `scenario_predictions` (Ŷ - Predictions)
```sql
CREATE TABLE scenario_predictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES kitting_jobs(id) ON DELETE CASCADE,

  -- Predicted schedule (Ŷ values)
  predicted_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_duration INTEGER NOT NULL,  -- seconds
  predicted_shift_utilization NUMERIC(5,4),  -- 0.0000 to 1.0000

  -- Scenario context
  includes_delays BOOLEAN DEFAULT FALSE,
  total_delay_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scenario_predictions_scenario_id ON scenario_predictions(scenario_id);
CREATE INDEX idx_scenario_predictions_job_id ON scenario_predictions(job_id);
```

#### `residual_analysis` (Y - Ŷ = Residuals)
```sql
CREATE TABLE residual_analysis (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Links
  job_id TEXT NOT NULL REFERENCES kitting_jobs(id) ON DELETE CASCADE,
  execution_id TEXT REFERENCES job_execution_history(id) ON DELETE CASCADE,
  scenario_id TEXT REFERENCES scenarios(id) ON DELETE SET NULL,  -- NULL = production baseline
  prediction_id TEXT REFERENCES scenario_predictions(id) ON DELETE SET NULL,

  -- Residual metrics
  residual_type TEXT NOT NULL,  -- 'duration', 'schedule', 'utilization', 'delay_impact'

  -- Duration residuals (seconds)
  predicted_duration INTEGER,
  actual_duration INTEGER,
  duration_residual INTEGER,         -- Y - Ŷ (positive = took longer)
  duration_residual_pct NUMERIC(8,4),  -- percentage

  -- Schedule residuals (minutes)
  predicted_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  schedule_residual_minutes INTEGER,  -- Y - Ŷ

  -- Utilization residuals (decimal)
  predicted_utilization NUMERIC(5,4),
  actual_utilization NUMERIC(5,4),
  utilization_residual NUMERIC(5,4),  -- Y - Ŷ

  -- Metadata
  root_cause TEXT,                   -- Why did the residual occur?
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_residual_analysis_job_id ON residual_analysis(job_id);
CREATE INDEX idx_residual_analysis_scenario_id ON residual_analysis(scenario_id);
CREATE INDEX idx_residual_analysis_type ON residual_analysis(residual_type);
CREATE INDEX idx_residual_analysis_created_at ON residual_analysis(created_at);
```

#### `scenario_performance_metrics` (Aggregate Ŷ Accuracy)
```sql
CREATE TABLE scenario_performance_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

  -- Summary statistics
  total_predictions INTEGER DEFAULT 0,
  total_residuals_calculated INTEGER DEFAULT 0,

  -- Duration accuracy
  mean_duration_residual NUMERIC(10,2),      -- Average error in seconds
  median_duration_residual NUMERIC(10,2),
  stddev_duration_residual NUMERIC(10,2),    -- Spread of errors
  mean_absolute_error NUMERIC(10,2),         -- MAE
  root_mean_square_error NUMERIC(10,2),      -- RMSE

  -- Schedule accuracy
  mean_schedule_residual_minutes NUMERIC(10,2),
  median_schedule_residual_minutes NUMERIC(10,2),

  -- Model quality indicators
  r_squared NUMERIC(5,4),                    -- How much variance explained (0-1)
  prediction_accuracy_score NUMERIC(5,4),    -- Overall score (0-1, higher is better)

  -- Timestamps
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scenario_performance_scenario_id ON scenario_performance_metrics(scenario_id);
```

---

## API Endpoints Design

### Residual Analysis API

#### 1. Record Job Execution (Y)
```typescript
POST /api/job-executions
{
  jobId: string;
  actualStartTime: DateTime;
  actualEndTime?: DateTime;
  completedKits: number;
  targetKits: number;
  stationsUsed: number;
}

Response: {
  executionId: string;
  residualsCalculated: boolean;
  durationResidual?: number;  // If job completed
}
```

#### 2. Calculate Residuals for Job
```typescript
POST /api/residuals/calculate
{
  executionId: string;
  scenarioId?: string;  // If comparing to specific scenario prediction
}

Response: {
  residuals: ResidualAnalysis[];
  summary: {
    durationResidual: number;
    scheduleResidual: number;
    accuracy: 'excellent' | 'good' | 'fair' | 'poor';
  }
}
```

#### 3. Get Residual Analytics
```typescript
GET /api/residuals/analytics
Query Params:
  - scenarioId?: string
  - jobId?: string
  - residualType?: 'duration' | 'schedule' | 'utilization' | 'delay_impact'
  - startDate?: DateTime
  - endDate?: DateTime
  - aggregation?: 'daily' | 'weekly' | 'monthly'

Response: {
  residuals: ResidualAnalysis[];
  statistics: {
    mean: number;
    median: number;
    stddev: number;
    min: number;
    max: number;
    count: number;
  };
  trend: {
    direction: 'improving' | 'stable' | 'degrading';
    confidence: number;  // 0-1
  };
}
```

#### 4. Compare Scenarios (Multi-Ŷ Analysis)
```typescript
GET /api/scenarios/compare
Query Params:
  - scenarioIds: string[]  // Compare multiple predictions
  - metric: 'duration' | 'schedule' | 'utilization' | 'overall'

Response: {
  scenarios: Array<{
    scenarioId: string;
    name: string;
    performanceScore: number;  // 0-1 (higher is better)
    meanResidual: number;
    accuracy: string;
    totalPredictions: number;
  }>;
  recommendation: {
    bestScenarioId: string;
    reason: string;
    confidenceScore: number;
  };
}
```

#### 5. Update Scenario Performance Metrics
```typescript
POST /api/scenarios/:scenarioId/recalculate-metrics

Response: {
  scenarioId: string;
  metrics: ScenarioPerformanceMetrics;
  updated: DateTime;
}
```

---

## Statistical Analysis Methods

### 1. Mean Absolute Error (MAE)
```typescript
function calculateMAE(residuals: number[]): number {
  const absoluteErrors = residuals.map(r => Math.abs(r));
  return absoluteErrors.reduce((sum, err) => sum + err, 0) / residuals.length;
}
```

**Interpretation**: Average magnitude of prediction errors (always positive)

### 2. Root Mean Square Error (RMSE)
```typescript
function calculateRMSE(residuals: number[]): number {
  const squaredErrors = residuals.map(r => r * r);
  const meanSquaredError = squaredErrors.reduce((sum, err) => sum + err, 0) / residuals.length;
  return Math.sqrt(meanSquaredError);
}
```

**Interpretation**: Penalizes large errors more heavily than MAE

### 3. R-Squared (Coefficient of Determination)
```typescript
function calculateRSquared(actual: number[], predicted: number[]): number {
  const meanActual = actual.reduce((sum, y) => sum + y, 0) / actual.length;

  const totalSumSquares = actual.reduce((sum, y) => sum + Math.pow(y - meanActual, 2), 0);
  const residualSumSquares = actual.reduce((sum, y, i) => {
    return sum + Math.pow(y - predicted[i], 2);
  }, 0);

  return 1 - (residualSumSquares / totalSumSquares);
}
```

**Interpretation**:
- R² = 1.0 → Perfect predictions (all residuals = 0)
- R² = 0.8 → 80% of variance explained (good model)
- R² = 0.5 → 50% of variance explained (fair model)
- R² < 0.3 → Poor model

### 4. Trend Detection
```typescript
function detectTrend(residuals: Array<{ value: number; timestamp: DateTime }>): TrendResult {
  // Simple linear regression on residuals over time
  const n = residuals.length;
  const x = residuals.map((_, i) => i);  // Time index
  const y = residuals.map(r => r.value);

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope < -0.1) return { direction: 'improving', confidence: Math.abs(slope) };
  if (slope > 0.1) return { direction: 'degrading', confidence: slope };
  return { direction: 'stable', confidence: 1 - Math.abs(slope) };
}
```

**Interpretation**:
- Improving → Residuals getting smaller over time (better predictions)
- Stable → No clear trend
- Degrading → Residuals getting larger over time (worse predictions)

---

## UI Components for Analytics

### 1. Residual Dashboard

**Location**: New page `/analytics/residuals`

**Components**:
- **Residual Time Series Chart**: Plot residuals over time
- **Distribution Histogram**: Show spread of residuals
- **Scenario Comparison Table**: Rank scenarios by accuracy
- **Trend Indicators**: Visual arrows showing improvement/degradation
- **Root Cause Analysis**: Group residuals by identified causes

### 2. Enhanced Y Overlay Cards

**Current**: Purple ghost jobs with scenario name badge

**Add**:
- **Prediction Confidence Badge**: Show historical accuracy %
  ```tsx
  {scenarioAccuracy && (
    <div className="text-xs bg-green-500/80 px-1 rounded">
      {scenarioAccuracy.toFixed(0)}% accurate
    </div>
  )}
  ```

### 3. Job Execution Feedback Modal

**Trigger**: After job completion

**Purpose**: Capture actual execution data for residual calculation

**Fields**:
- Actual completion time (auto-filled from execution records)
- Root cause of any delays (dropdown + text)
- Notes on what went differently than predicted

### 4. Scenario Recommendation Widget

**Location**: Dashboard header or What-If panel

**Display**:
```
📊 Scenario Recommendations (Based on Historical Accuracy)

🥇 "Equipment Delays" - 87% accurate (23 predictions)
🥈 "Rush Order" - 82% accurate (15 predictions)
🥉 "Standard Forecast" - 78% accurate (45 predictions)

✅ Recommended: Use "Equipment Delays" for next scheduling decision
```

---

## Implementation Roadmap

### Phase 1: Data Collection Infrastructure (Weeks 1-2)
- [ ] Create database migrations for new tables
- [ ] Implement job execution history tracking
- [ ] Build API endpoints for recording Y (actual) values
- [ ] Add UI for post-job execution feedback

### Phase 2: Residual Calculation Engine (Weeks 3-4)
- [ ] Implement residual calculation functions
- [ ] Build scenario prediction storage
- [ ] Create residual analysis API endpoints
- [ ] Add statistical calculation utilities (MAE, RMSE, R²)

### Phase 3: Analytics UI (Weeks 5-6)
- [ ] Create Residual Dashboard page
- [ ] Build residual visualization charts
- [ ] Add scenario comparison tools
- [ ] Implement recommendation engine

### Phase 4: Continuous Improvement Loop (Weeks 7-8)
- [ ] Build trend detection algorithms
- [ ] Create alerts for degrading predictions
- [ ] Implement auto-adjustment of prediction parameters
- [ ] Add machine learning preparation hooks

### Phase 5: Advanced Analytics (Future)
- [ ] Multi-variate regression models
- [ ] Seasonality detection
- [ ] Resource constraint modeling
- [ ] Monte Carlo simulation for uncertainty quantification

---

## Code Terminology Updates

### Current → New Naming

#### Variables and Functions
```typescript
// OLD (confusing)
const scenarios = whatIf.allScenarios;
const overlayJobs = whatIf.yOverlayJobs;

// NEW (statistical clarity)
const yHatScenarios = whatIf.allYHatScenarios;  // All predictions
const yHatOverlayJobs = whatIf.yHatOverlayJobs; // Predicted jobs to display
const yProductionJobs = productionJobs;          // Actual reality
```

#### UI Labels
```typescript
// Filter Panel Tabs
"📋 Y (Production)" // Reality
"🔮 Ŷ (Scenarios)"   // Predictions

// Overlay Badges
"🔮 Ŷ: Equipment Delays"  // On purple ghost jobs
"Y - Production"           // On solid production jobs (optional label)

// Analytics UI
"Y vs Ŷ Analysis"          // Residual dashboard title
"Y - Ŷ Residuals"          // Chart label
"Ŷ Accuracy: 87%"          // Scenario performance badge
```

#### Database Columns (Future Migrations)
```sql
-- Clarity in field names
ALTER TABLE scenarios ADD COLUMN yhat_type TEXT DEFAULT 'forecast';
-- yhat_type: 'forecast', 'what_if', 'historical_replay', 'optimization'

ALTER TABLE residual_analysis ADD COLUMN y_actual_value NUMERIC;
ALTER TABLE residual_analysis ADD COLUMN yhat_predicted_value NUMERIC;
ALTER TABLE residual_analysis ADD COLUMN residual NUMERIC;  -- Y - Ŷ
```

#### Comments in Code
```typescript
/**
 * Calculate residuals (Y - Ŷ) for job execution
 * @param y - Actual production outcome (reality)
 * @param yhat - Predicted outcome from scenario (forecast)
 * @returns Residual object with statistical metrics
 */
function calculateResiduals(y: JobExecution, yhat: ScenarioPrediction): Residual {
  const durationResidual = y.actualDuration - yhat.predictedDuration;
  // Positive residual = job took LONGER than predicted
  // Negative residual = job took SHORTER than predicted

  return {
    residual: durationResidual,
    residualPercentage: (durationResidual / yhat.predictedDuration) * 100,
    yActual: y.actualDuration,
    yHatPredicted: yhat.predictedDuration
  };
}
```

---

## Data-Driven Evolution Strategy

### As Data Accumulates (6+ Months of Production History)

#### 1. Pattern Recognition
- **Identify systematic biases**: "We always underestimate assembly jobs by 15%"
- **Detect seasonal patterns**: "December jobs take 20% longer (holiday staffing)"
- **Resource correlations**: "Jobs on Machine A vs Machine B have different duration distributions"

#### 2. Auto-Adjustment of Predictions
```typescript
// Future enhancement
function adjustYHatPrediction(job: KittingJob, historicalResiduals: Residual[]): number {
  const baseEstimate = job.expectedJobDuration;

  // Find similar jobs in history
  const similarJobs = historicalResiduals.filter(r =>
    r.jobType === job.jobType &&
    r.customer === job.customer
  );

  if (similarJobs.length >= 10) {
    // Calculate average bias
    const meanResidual = calculateMean(similarJobs.map(r => r.residual));

    // Adjust prediction to compensate for historical bias
    const adjustedYHat = baseEstimate + meanResidual;

    console.log(`🔮 Ŷ adjusted from ${baseEstimate}s to ${adjustedYHat}s based on ${similarJobs.length} historical residuals`);

    return adjustedYHat;
  }

  return baseEstimate;  // Not enough data yet
}
```

#### 3. Confidence Intervals
```typescript
// Add uncertainty quantification to predictions
interface YHatPrediction {
  value: number;              // Point estimate
  confidenceInterval: {
    lower: number;            // 95% CI lower bound
    upper: number;            // 95% CI upper bound
    stddev: number;           // Standard deviation
  };
  dataPoints: number;         // How many historical observations used
}

// UI visualization
"Predicted Duration: 4.5h ± 0.7h (95% CI: 3.8h - 5.2h)"
```

#### 4. Scenario Ranking by Historical Performance
```typescript
// Automatically recommend scenarios with best track record
function rankScenariosByAccuracy(scenarios: Scenario[]): RankedScenario[] {
  return scenarios
    .map(scenario => ({
      scenario,
      metrics: getScenarioPerformanceMetrics(scenario.id),
      score: calculateAccuracyScore(scenario.id)
    }))
    .sort((a, b) => b.score - a.score);
}

// UI display
"✅ Recommended Scenario: 'Equipment Delays' (87% historical accuracy, 23 predictions)"
```

---

## Integration with Existing Systems

### 1. Job Execution Tracking

**Hook into existing flow**:
```typescript
// src/pages/JobExecute.tsx
useEffect(() => {
  if (jobProgress?.status === 'completed') {
    // Record Y (actual execution data)
    recordJobExecution({
      jobId: job.id,
      actualStartTime: jobProgress.startTime,
      actualEndTime: new Date(),
      completedKits: stationKitsCompleted,
      targetKits: job.kitsRequired,
      stationsUsed: jobProgress.nextStationNumber || 1
    });
  }
}, [jobProgress?.status]);
```

### 2. Scenario Overlay Display

**Enhanced Y/Ŷ badges**:
```typescript
// src/components/DurationBasedEvent.tsx
{isYHatScenario && (
  <div className="purple-badge">
    🔮 Ŷ: {event.__yScenarioName}
    {scenarioAccuracy && (
      <span className="ml-2 text-xs bg-green-500/80 px-1 rounded">
        {scenarioAccuracy.toFixed(0)}% acc.
      </span>
    )}
  </div>
)}
```

### 3. Dashboard Analytics Widget

**New component**:
```typescript
// src/components/ResidualSummaryWidget.tsx
export const ResidualSummaryWidget = () => {
  const { recentResiduals, trend } = useResidualAnalytics({ days: 30 });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold">Y vs Ŷ Analysis (Last 30 Days)</h3>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <MetricCard
          label="Mean Residual"
          value={`${recentResiduals.mean.toFixed(0)}s`}
          trend={trend.direction}
        />
        <MetricCard
          label="Prediction Accuracy"
          value={`${(1 - Math.abs(recentResiduals.meanPct / 100)).toFixed(2) * 100}%`}
        />
        <MetricCard
          label="Total Observations"
          value={recentResiduals.count}
        />
      </div>

      <TrendChart data={recentResiduals.timeSeries} />
    </div>
  );
};
```

---

## Future Machine Learning Integration

### Data Preparation
- **Feature engineering**: Job type, customer, kit count, shift, day of week, station assignments
- **Target variable**: Actual duration (Y)
- **Training data**: Historical job executions with all features
- **Model type**: Gradient boosting regression (XGBoost, LightGBM)

### Prediction Pipeline
```typescript
// Future enhancement (6-12 months)
async function predictJobDurationML(job: KittingJob): Promise<YHatPrediction> {
  const features = extractFeatures(job);
  const prediction = await mlModel.predict(features);

  return {
    value: prediction.duration,
    confidenceInterval: prediction.confidenceInterval,
    model: 'xgboost_v2',
    trainingDataSize: mlModel.metadata.trainingSize
  };
}
```

### A/B Testing Scenarios
- **Control**: Current rule-based predictions
- **Treatment**: ML-enhanced predictions
- **Metric**: RMSE of residuals
- **Decision**: Adopt ML if RMSE reduces by >15%

---

## Documentation for Future Sessions

### Quick Reference Card

**Key Concepts**:
- **Y** = Production reality (actual outcomes)
- **Ŷ** = Scenario predictions (forecasted outcomes)
- **Y - Ŷ** = Residuals (prediction errors)
- **Goal** = Minimize |Y - Ŷ| over time through data-driven improvements

**Database Tables**:
- `kitting_jobs` → Y (production jobs)
- `scenarios` → Ŷ metadata
- `scenario_changes` → Ŷ modifications
- `job_execution_history` → Y actuals
- `scenario_predictions` → Ŷ predictions
- `residual_analysis` → Y - Ŷ calculations

**Key Files**:
- `src/hooks/useWhatIfMode.ts` → Ŷ scenario state management
- `src/utils/shiftScheduling.ts` → Scheduling algorithms
- `src/components/DurationBasedEvent.tsx` → Y and Ŷ visual rendering
- `server/index.cjs` → API endpoints

**Next Developer Tasks**:
1. Implement `job_execution_history` table
2. Build residual calculation API endpoints
3. Create analytics dashboard UI
4. Add scenario accuracy badges
5. Implement trend detection algorithms

---

## Appendix: Statistical Formulas

### Mean Absolute Error (MAE)
```
MAE = (1/n) × Σ|Y - Ŷ|
```

### Root Mean Square Error (RMSE)
```
RMSE = √[(1/n) × Σ(Y - Ŷ)²]
```

### R-Squared (Coefficient of Determination)
```
R² = 1 - (SS_res / SS_tot)
where:
  SS_res = Σ(Y - Ŷ)²  (residual sum of squares)
  SS_tot = Σ(Y - Ȳ)²  (total sum of squares)
  Ȳ = mean of Y values
```

### Mean Absolute Percentage Error (MAPE)
```
MAPE = (100/n) × Σ|(Y - Ŷ)/Y|
```

### Confidence Interval (95%)
```
CI = Ŷ ± 1.96 × SE
where:
  SE = standard error = σ / √n
  σ = standard deviation of residuals
  n = number of observations
```

---

**Document Version**: 1.0
**Last Updated**: November 6, 2025
**Next Review**: After 50+ job executions with residual tracking enabled
