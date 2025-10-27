// app/training/log/page.tsx
'use client';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { Separator } from '@/components/ui/separator';
import { Clock, Heart, Zap, Map, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock Data structure for a single workout summary
const MOCK_SUMMARY = {
    date: 'Oct 16, 2025',
    type: 'Tempo Run',
    distance_miles: 6.2,
    duration_minutes: 55,
    avg_heart_rate: 165,
    avg_pace_min_mile: '5:53',
};

const MOCK_AI_INSIGHTS = [
    { type: 'Alert', text: 'Fatigue Warning: Your average heart rate was 10 bpm higher than your predicted Zone 3 for this pace. Consider an easy day tomorrow, per training model adjustments.' },
    { type: 'Insight', text: 'Nutritional Check: Your run followed two hard lifting sessions. Increased duration without compensatory fueling is statistically linked to slower recovery rates. (Source: Journal of Sports Nutrition, 2023).' },
];

export default function TrainingLogPage() {
    const [aiInsights, setAiInsights] = useState(MOCK_AI_INSIGHTS);

    // NOTE: This button click would trigger the backend RAG process
    const handleGetInsight = () => {
        // Simulate loading and fetching the RAG analysis
        setAiInsights([]);
        // API call to the RAG service happens here
        setTimeout(() => setAiInsights(MOCK_AI_INSIGHTS), 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-5xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <Map className="w-8 h-8 mr-4 text-mana-green-600" />
                    Workout Log & Insights
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Phase 2: Data from connected wearables (Garmin/Strava) meets evidence-based AI.
                </p>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="max-w-5xl mx-auto space-y-8">
                
                {/* Workout Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-mana-blue-600">
                    <h2 className="text-2xl font-bold mb-4 flex justify-between items-center">
                        <span>{MOCK_SUMMARY.type} - {MOCK_SUMMARY.date}</span>
                        <Button onClick={handleGetInsight} className="bg-mana-green-600 hover:bg-mana-green-700 text-white flex items-center">
                            <Zap className="w-4 h-4 mr-2" />
                            Generate AI Insight
                        </Button>
                    </h2>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <MetricCard icon={Map} label="Distance" value={`${MOCK_SUMMARY.distance_miles} mi`} color="blue" />
                        <MetricCard icon={Clock} label="Duration" value={`${MOCK_SUMMARY.duration_minutes} min`} color="blue" />
                        <MetricCard icon={Heart} label="Avg HR" value={`${MOCK_SUMMARY.avg_heart_rate} bpm`} color="red" />
                        <MetricCard icon={Clock} label="Avg Pace" value={MOCK_SUMMARY.avg_pace_min_mile} color="green" />
                    </div>
                </div>

                {/* AI Insights Output */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">Evidence-Based Feedback</h3>
                    {aiInsights.length > 0 ? (
                        aiInsights.map((insight, index) => (
                            <div key={index} className="p-4 rounded-lg border-l-4 border-yellow-600 bg-yellow-50 text-yellow-800 flex items-start space-x-3">
                                <AlertTriangle className="w-5 h-5 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">{insight.type} Warning:</p>
                                    <p className="text-sm">{insight.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 italic">Click &apos;Generate AI Insight&apos; to receive expert analysis.</p>
                    )}
                </div>

            </main>
        </div>
    );
}

// Simple Card Component for Metrics
const MetricCard = ({ icon: Icon, label, value, color }: { icon: ComponentType<Record<string, unknown>>, label: string, value: string, color: string }) => (
    <div className={`p-3 rounded-lg bg-white shadow-md border border-gray-200`}>
        <div className={`flex justify-center items-center text-${color}-600 mb-1`}>
            <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-xl font-bold text-gray-900`}>{value}</p>
    </div>
);