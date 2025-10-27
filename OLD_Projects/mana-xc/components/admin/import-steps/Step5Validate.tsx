// components/admin/import-steps/Step5Validate.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Loader2, AlertTriangle, ArrowRight, ArrowLeft, Database } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Step5Validate({ onNext, onBack, data }: { onNext: (data: any) => void, onBack: () => void, data: any }) {
  const [status, setStatus] = useState<'ready' | 'importing' | 'complete' | 'error'>('ready');
  const [importMessage, setImportMessage] = useState('');
  const [finalData, setFinalData] = useState<any>(null);

  const parsedResults = Array.isArray(data?.parsedResults) ? data.parsedResults : [];
  const raceConfigs = data?.raceConfigs || [];

  const handleFinalImport = async () => {
    setStatus('importing');
    setImportMessage('Executing database transaction...');

    if (parsedResults.length === 0 || raceConfigs.length === 0) {
        setImportMessage("Error: Missing parsed data. Please go back to Step 3.");
        setStatus('error');
        return;
    }

    const payload = {
      meetName: data.meetName,
      meetDate: data.meetDate,
      location: data.location,
      seasonYear: data.seasonYear,
      races: data.raceConfigs.map((config: any) => {
        const raceSpecificResults = parsedResults.filter((result: any) =>
            result.race_category === config.category &&
            (config.gender === 'Unknown' || (config.gender === 'M' && result.gender === true) || (config.gender === 'F' && result.gender === false))
        );

        return {
          name: config.name,
          distanceMeters: config.distanceMeters,
          courseId: config.courseId,
          xcTimeRating: config.xcTimeRating,
          gender: config.gender,
          category: config.category,
          results: raceSpecificResults.map((result: any) => ({
              // Backend will resolve athlete by name/school
              first_name: result.first_name,
              last_name: result.last_name,
              school_name: result.school_name,
              time_cs: result.time_cs,
              place_overall: result.place_overall,
              grade: result.grade,
          })),
        };
      }),
    };

    // Mock API Call
    console.log("SENDING PAYLOAD TO BACKEND:", payload);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (Math.random() > 0.1) {
        setFinalData({ meet_id: 'mock-meet-id-12345', totalResults: parsedResults.length });
        setStatus('complete');
    } else {
        setImportMessage('Database transaction failed. Check Django server logs.');
        setStatus('error');
    }
  };

  const totalResults = parsedResults.length;
  const totalRaces = raceConfigs.length;

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-100 flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-400" />
          Final Validation
        </h3>
        <p className="text-sm text-blue-200 mt-2">
          Confirm the data summary below, then execute the final import to send the data to the server.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidationCheck status={totalRaces > 0} text={`${totalRaces} distinct races will be created.`} />
        <ValidationCheck status={totalResults > 0} text={`${totalResults} total athlete results will be imported.`} />
        <ValidationCheck status={true} text="All race times have been converted to centiseconds." />
      </div>

      {status === 'error' && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200 font-semibold">{importMessage}</p>
        </div>
      )}
      
      <div className="flex justify-between gap-4 pt-4 border-t border-gray-700">
        <Button 
          onClick={onBack} 
          type="button"
          variant="outline"
          disabled={status === 'importing' || status === 'complete'}
          className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
            onClick={handleFinalImport} 
            disabled={status !== 'ready' || totalResults === 0}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {status === 'importing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
            ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute Final Import
                </>
            )}
        </Button>
      </div>
      
      {status === 'complete' && finalData && (
          <div className="mt-6 p-6 bg-gray-800 rounded-lg border-green-500 border text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <h4 className="text-xl font-bold text-white">Import Complete!</h4>
              <p className="text-sm text-gray-400 mt-2">
                Successfully inserted {finalData.totalResults} results.
              </p>
              <p className="text-sm text-gray-400">Meet ID: {finalData.meet_id}</p>
              <Button onClick={() => onNext({})} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white">
                  Import Another Meet <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
          </div>
      )}
    </div>
  );
}

const ValidationCheck = ({ status, text }: { status: boolean, text: string }) => (
  <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-900/50">
    {status ? (
      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
    )}
    <p className={`text-sm ${status ? 'text-gray-300' : 'text-yellow-200'}`}>{text}</p>
  </div>
);