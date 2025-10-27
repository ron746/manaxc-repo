// components/admin/import-steps/Step1MeetInfo.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Trophy, ArrowRight, AlertCircle } from 'lucide-react';

interface MeetData {
  meetName: string;
  meetDate: string;
  location: string;
  seasonYear?: number;
}

export default function Step1MeetInfo({ onNext, data }: { onNext: (data: MeetData) => void, onBack?: () => void, data: Record<string, unknown> }) {
  const [formData, setFormData] = useState<MeetData>({
    meetName: String((data as Record<string, unknown>)?.meetName ?? ''),
    meetDate: String((data as Record<string, unknown>)?.meetDate ?? new Date().toISOString().split('T')[0]),
    location: String((data as Record<string, unknown>)?.location ?? ''),
  });
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.meetName || !formData.meetDate || !formData.location) {
      setError('Please fill out all required fields.');
      return;
    }
    
    const dateYear = new Date(formData.meetDate).getFullYear();
    if (isNaN(dateYear)) {
      setError('Invalid date format.');
      return;
    }
    
    setError('');
  onNext({ ...formData, seasonYear: dateYear });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          Meet Information
        </h2>
        <p className="text-sm text-gray-400">
          Enter basic details about the cross country meet
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Meet Name */}
        <div className="bg-gray-800/30 p-5 rounded-lg border border-gray-700">
          <Label htmlFor="meetName" className="text-sm font-medium text-white flex items-center mb-3">
            <Trophy className="w-4 h-4 mr-2 text-blue-400" />
            Meet Name
            <span className="text-red-400 ml-1">*</span>
          </Label>
          <Input 
            id="meetName"
            name="meetName"
            type="text"
            value={formData.meetName}
            onChange={handleChange}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-11"
            placeholder="e.g., WCAL Championships, Crystal Springs Invitational"
          />
        </div>

        {/* Date and Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meet Date */}
          <div className="bg-gray-800/30 p-5 rounded-lg border border-gray-700">
            <Label htmlFor="meetDate" className="text-sm font-medium text-white flex items-center mb-3">
              <Calendar className="w-4 h-4 mr-2 text-blue-400" />
              Date
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Input 
              id="meetDate"
              name="meetDate"
              type="date"
              value={formData.meetDate}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white h-11"
            />
            <p className="text-xs text-gray-500 mt-2">
              Season year will be auto-calculated
            </p>
          </div>
          
          {/* Location */}
          <div className="bg-gray-800/30 p-5 rounded-lg border border-gray-700">
            <Label htmlFor="location" className="text-sm font-medium text-white flex items-center mb-3">
              <MapPin className="w-4 h-4 mr-2 text-blue-400" />
              Location
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Input 
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-11"
              placeholder="e.g., Crystal Springs, Belmont CA"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-blue-200">
          <strong className="text-blue-100">Next steps:</strong> After entering meet info, 
          you&apos;ll upload a CSV file with race results and map the columns to database fields.
        </p>
      </div>
      
      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
      >
        Continue to File Upload
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}

        <li>• <strong>Top 3 Season Avg:</strong> Average of athlete&apos;s 3 fastest races this season</li>
