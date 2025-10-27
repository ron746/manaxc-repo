// lib/prediction/predict-engine.ts
import { formatTime } from '@/lib/time-utils';

interface PredictionFactors {
    predicted_time_cs: number;
    rua_time_cs: number;
    target_rating: number;
    grade_level: number;
    maturation_factor: number; // The alpha factor (e.g., 0.975)
}

/**
 * Executes the complex statistical logic for the Diminishing Returns (Beta) factor.
 * The core concept: The faster the RUA, the greater the exponential penalty.
 * * @param ruaTimeCs Runner's Universal Ability Time (Centiseconds)
 * @returns The Diminishing Returns Multiplier (e.g., 1.005 for 0.5% penalty)
 */
function calculateDiminishingReturnsFactor(ruaTimeCs: number): number {
    // 1. Define the Elite Benchmark (e.g., a 15:00 5K runner, which is 90000 cs)
    const ELITE_BENCHMARK_CS = 90000; 

    // 2. Define the Penalty Curve Parameters (Adjusted based on future data analysis)
    // - BasePenalty: The minimum penalty applied even to slow runners.
    // - MaxPenaltyFactor: The maximum exponential penalty applied near the benchmark.
    const BASE_PENALTY = 0.005; // 0.5% penalty floor
    const MAX_PENALTY_FACTOR = 0.035; // Max 3.5% penalty

    // 3. Normalized Ability Score (0 for slow, 1 for elite/near-record)
    // Use a reciprocal function to calculate the score based on speed: (1 - time/benchmark)
    // Faster time -> Score closer to 1.0
    const normalizedScore = Math.max(0, 1 - (ruaTimeCs / (ELITE_BENCHMARK_CS * 1.5)));
    
    // 4. Apply Exponential Curve (Sigmoid/Logistical approach for simplicity here)
    // This creates an exponential curve where the penalty increases rapidly near 1.0
    const exponentialFactor = Math.pow(normalizedScore, 3); 

    // 5. Calculate Final Beta Multiplier
    const betaAdjustment = BASE_PENALTY + (MAX_PENALTY_FACTOR * exponentialFactor);
    
    // The model penalizes the time (makes it slower) as the athlete is faster.
    return (1 + betaAdjustment);
}


/**
 * Main prediction function that synthesizes SQL output (Base + Alpha) 
 * with Application Layer logic (Beta).
 */
export async function runFullPrediction(athleteId: string, targetRaceId: string): Promise<Record<string, unknown>> {
    
    // 1. Call Database Function (Base Prediction + Alpha Factor)
    const res = await fetch(`/api/predict-time?athleteId=${athleteId}&targetRaceId=${targetRaceId}`);
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(`DB Prediction Failed: ${error.details || error.error}`);
    }
    
    const { prediction } = await res.json();
    const factors: PredictionFactors = prediction;

    // 2. Calculate Diminishing Returns (BETA)
    const betaFactor = calculateDiminishingReturnsFactor(factors.rua_time_cs);

    // 3. Apply Final Formula: Final Predicted Time = DB_Output * Beta
    const finalPredictedTimeCs = factors.predicted_time_cs * betaFactor;

    // 4. Return Comprehensive Result
    return {
        predicted_time_cs: Math.round(finalPredictedTimeCs),
        predicted_time_display: formatTime(Math.round(finalPredictedTimeCs)),
        rua_time_display: formatTime(Number(factors.rua_time_cs)),
        factors: {
            target_rating: factors.target_rating.toFixed(3),
            maturation_factor: factors.maturation_factor.toFixed(3),
            diminishing_returns_factor: betaFactor.toFixed(4),
            grade_level: factors.grade_level,
        },
        warnings: factors.maturation_factor > 1.0 
            ? `Warning: Statistical average predicts a ${((factors.maturation_factor - 1) * 100).toFixed(1)}% slowdown due to progression phase.`
            : null
    };
}