// components/admin/import-steps/Step3MapColumns.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Info, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSVData } from '@/lib/admin/import-parser';

const requiredFieldsSplit = [
  { dbField: 'first_name', label: 'First Name', icon: '👤' },
  { dbField: 'last_name', label: 'Last Name', icon: '👤' },
];

const requiredFieldsCommon = [
  { dbField: 'school_name', label: 'School Name', icon: '🏫' },
  { dbField: 'time_cs', label: 'Time (MM:SS.CC)', icon: '⏱️' },
];

const optionalFields = [
  { dbField: 'full_name', label: 'Full Name (if not split)', icon: '👤' },
  { dbField: 'place_overall', label: 'Place Overall', icon: '🏆' },
  { dbField: 'race_category', label: 'Race Category', icon: '🏃' },
  { dbField: 'gender', label: 'Gender (M/F/Boys/Girls)', icon: '⚧️' },
  { dbField: 'grade', label: 'Grade (9-12)', icon: '🎓' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Step3MapColumns({ onNext, onBack, data }: { onNext: (data: any) => void, onBack: () => void, data: any }) {
  const [useFullName, setUseFullName] = useState(false);
  
  useEffect(() => {
    const hasFullNameColumn = data.csvHeaders?.some((h: string) => 
      h.toLowerCase().includes('athlete') || 
      h.toLowerCase() === 'name' ||
      h.toLowerCase() === 'fullname'
    );
    setUseFullName(hasFullNameColumn);
  }, [data.csvHeaders]);
  
  const getInitialMapping = () => {
    const mapping: Record<string, string> = {};
    data.csvHeaders?.forEach((header: string) => {
      const lower = header.toLowerCase();
      if (lower.includes('athlete') || lower === 'name' || lower === 'fullname') mapping['full_name'] = header;
      if (lower.includes('school')) mapping['school_name'] = header;
      if (lower.includes('time') || lower.includes('duration')) mapping['time_cs'] = header;
      if (lower.includes('place') && !lower.includes('birth')) mapping['place_overall'] = header;
      if (lower.includes('gender') || lower.includes('sex')) mapping['gender'] = header;
      if (lower.includes('grade') || lower.includes('year')) mapping['grade'] = header;
      if (lower.includes('race') && !lower.includes('place')) mapping['race_category'] = header;
      if (lower.includes('first')) mapping['first_name'] = header;
      if (lower.includes('last')) mapping['last_name'] = header;
    });
    return mapping;
  };
  
  const [mapping, setMapping] = useState<Record<string, string>>(getInitialMapping());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMapChange = (dbField: string, csvHeader: string) => {
    setMapping(prev => ({ ...prev, [dbField]: csvHeader }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hasFullName = !!mapping['full_name'];
    const hasFirstLast = !!mapping['first_name'] && !!mapping['last_name'];
    
    if (!hasFullName && !hasFirstLast) {
      setError('You must map either "Full Name" OR both "First Name" and "Last Name".');
      setLoading(false);
      return;
    }
    
    const missingRequired = requiredFieldsCommon.filter(field => !mapping[field.dbField]);
    if (missingRequired.length > 0) {
      setError(`Missing required fields: ${missingRequired.map(f => f.label).join(', ')}.`);
      setLoading(false);
      return;
    }
    
    setTimeout(() => {
        const parsedResults = parseCSVData(data.rawCsvText, mapping);
        
        if (parsedResults.length === 0) {
            setError('Parsing complete, but no valid results found. Check column mapping and ensure times are in MM:SS.CC format.');
            setLoading(false);
            return;
        }

        onNext({ 
            ...data, 
            mapping: mapping, 
            parsedResults: parsedResults, 
            totalResults: parsedResults.length 
        });
    }, 500);
  };

  const nameFields = useFullName 
    ? [{ dbField: 'full_name', label: 'Full Name', icon: '👤', required: true, description: 'Will be automatically split' }]
    : requiredFieldsSplit.map(f => ({ ...f, required: true, description: '' }));

  const allRequiredFields = [...nameFields, ...requiredFieldsCommon.map(f => ({ ...f, required: true, description: '' }))];
  const mappedRequired = allRequiredFields.filter(f => !!mapping[f.dbField]).length;
  const totalRequired = allRequiredFields.length;
  const mappedOptional = optionalFields.filter(f => f.dbField !== 'full_name' && mapping[f.dbField]).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Map CSV Columns to Database Fields
          </h2>
          <p className="text-sm text-gray-400">
            Match your CSV columns to the required database fields
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">
            {mappedRequired}/{totalRequired}
          </div>
          <div className="text-xs text-gray-500">Required fields</div>
        </div>
      </div>

      {useFullName && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-200 mb-1">
                Full Name Detected
              </div>
              <p className="text-sm text-blue-300/80">
                The system will automatically split this column:
              </p>
              <div className="mt-2 font-mono text-xs text-blue-200 bg-blue-950/50 p-2 rounded">
                &quot;Edward Innes&quot; &rarr; First: &quot;Edward&quot;, Last: &quot;Innes&quot;
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
        <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Available CSV Columns ({data.csvHeaders?.length || 0})
        </div>
        <div className="flex flex-wrap gap-2">
          {data.csvHeaders?.map((h: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full border border-gray-700">
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-2">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <span className="text-red-400 mr-2">*</span>
            Required Fields
          </h3>
          <div className="text-sm text-gray-400">
            {mappedRequired} of {totalRequired} mapped
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allRequiredFields.map(field => (
            <div key={field.dbField} className={`p-4 rounded-lg border-2 transition-all ${mapping[field.dbField] ? 'bg-green-900/10 border-green-700/50' : 'bg-gray-800/30 border-gray-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-white flex items-center">
                  <span className="mr-2">{field.icon}</span>
                  {field.label}
                </Label>
                {mapping[field.dbField] && (<CheckCircle2 className="w-4 h-4 text-green-400" />)}
              </div>
              {field.description && (<p className="text-xs text-gray-500 mb-2">{field.description}</p>)}
              <Select onValueChange={(val) => handleMapChange(field.dbField, val)} value={mapping[field.dbField] || ''}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white max-h-60">
                  <SelectItem value="" className="hover:bg-gray-600">
                    <span className="text-gray-400">(Not mapped)</span>
                  </SelectItem>
                  {data.csvHeaders?.map((header: string) => (<SelectItem key={header} value={header} className="hover:bg-gray-600">{header}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-2">
          <h3 className="text-lg font-semibold text-gray-300">
            Optional Fields
          </h3>
          <div className="text-sm text-gray-400">
            {mappedOptional} mapped
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {optionalFields.filter(f => f.dbField !== 'full_name').map(field => (
            <div key={field.dbField} className="p-4 rounded-lg border bg-gray-800/20 border-gray-700">
              <Label className="text-sm font-medium text-gray-300 flex items-center mb-2">
                <span className="mr-2">{field.icon}</span>
                {field.label}
              </Label>
              <Select onValueChange={(val) => handleMapChange(field.dbField, val)} value={mapping[field.dbField] || ''}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white max-h-60">
                  <SelectItem value="" className="hover:bg-gray-600">
                    <span className="text-gray-400">(Not mapped)</span>
                  </SelectItem>
                  {data.csvHeaders?.map((header: string) => (<SelectItem key={header} value={header} className="hover:bg-gray-600">{header}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between gap-4 pt-4 border-t border-gray-700">
        <Button onClick={onBack} type="button" variant="outline" className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
        <Button type="submit" disabled={mappedRequired < totalRequired || loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-64">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Race Config
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}