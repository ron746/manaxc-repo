// components/admin/import-steps/Step2UploadFile.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, FileText, XCircle, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Step2UploadFile({ onNext, onBack, data }: { onNext: (data: any) => void, onBack: () => void, data: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Only CSV files are supported. Please upload a .csv file.');
      setFile(null);
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleParse = () => {
    if (!file) {
      setError('Please select a file to parse.');
      return;
    }

    setLoading(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.trim().split('\n');
        
        if (lines.length < 2) {
          setError('CSV file must contain at least a header row and one data row.');
          setLoading(false);
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());

        onNext({ 
          ...data,
          rawCsvText: csvText, 
          csvHeaders: headers,
          fileName: file.name
        });

      } catch (e) {
        console.error("Parsing error:", e);
        setError('Error reading file. Ensure it is a valid CSV format.');
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setLoading(false);
      setError('Failed to read the file.');
    };

    reader.readAsText(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          Upload CSV File
        </h2>
        <p className="text-sm text-gray-400">
          Upload race results in CSV format from Athletic.net or other timing systems
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 transition-all
          ${dragActive 
            ? 'border-blue-500 bg-blue-900/20' 
            : file 
            ? 'border-green-500 bg-green-900/10' 
            : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
          }
        `}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {file ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-400" />
              <div>
                <p className="text-lg font-semibold text-white">File Selected</p>
                <p className="text-sm text-gray-400 mt-1">Ready to parse and continue</p>
              </div>
            </>
          ) : (
            <>
              <UploadCloud className="w-16 h-16 text-gray-400" />
              <div>
                <p className="text-lg font-semibold text-white">
                  Drag and drop your CSV file here
                </p>
                <p className="text-sm text-gray-400 mt-1">or</p>
              </div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                  Browse Files
                </div>
                <Input 
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500">
                Maximum file size: 5MB • Supported format: CSV
              </p>
            </>
          )}
        </div>
      </div>

      {/* File Preview Card */}
      {file && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="bg-blue-900/50 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {file.name}
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-green-400 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Valid CSV
                  </span>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { 
                setFile(null); 
                setError(''); 
              }}
              className="text-gray-400 hover:text-red-400 transition ml-4"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Info Box */}
      {!file && !error && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            <strong className="text-blue-100">Supported formats:</strong> CSV files exported from 
            Athletic.net, MileSplit, or other timing systems. Make sure your file includes columns 
            for athlete names, times, schools, and places.
          </p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
        <Button 
          onClick={onBack}
          type="button"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleParse} 
          disabled={!file || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Parsing...
            </>
          ) : (
            <>
              Continue to Column Mapping
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
