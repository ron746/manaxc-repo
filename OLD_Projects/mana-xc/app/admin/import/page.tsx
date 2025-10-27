// mana-xc/app/admin/import/page.tsx
'use client'; 

import React, { useState } from 'react';
import Step1MeetInfo from '@/components/admin/import-steps/Step1MeetInfo';
import Step2UploadFile from '@/components/admin/import-steps/Step2UploadFile';
import Step3MapColumns from '@/components/admin/import-steps/Step3MapColumns';
import Step4RaceConfig from '@/components/admin/import-steps/Step4RaceConfig';
import Step5Validate from '@/components/admin/import-steps/Step5Validate';
import { CheckCircle } from 'lucide-react';

const steps = [
  { number: 1, title: 'Meet Info', description: 'Basic meet details' },
  { number: 2, title: 'Upload', description: 'CSV file upload' },
  { number: 3, title: 'Map Columns', description: 'Field mapping' },
  { number: 4, title: 'Configure', description: 'Race setup' },
  { number: 5, title: 'Import', description: 'Final validation' },
];

const AdminImportPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [importData, setImportData] = useState<Record<string, unknown>>({});

    const handleNext = (data: unknown) => {
        setImportData(prev => ({ ...prev, ...(data as Record<string, unknown>) }));
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1MeetInfo onNext={handleNext} onBack={handleBack} data={importData} />;
            case 2:
                return <Step2UploadFile onNext={handleNext} onBack={handleBack} data={importData} />;
            case 3:
                return <Step3MapColumns onNext={handleNext} onBack={handleBack} data={importData} />;
            case 4:
                return <Step4RaceConfig onNext={handleNext} onBack={handleBack} data={importData} />;
            case 5:
                return <Step5Validate onNext={handleNext} onBack={handleBack} data={importData} />;
            default:
                return <p className="text-center text-red-500">Import Wizard Error: Invalid Step</p>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Import Meet Results
                    </h1>
                    <p className="text-gray-400">
                        Upload and process race results from CSV files
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.number}>
                                {/* Step Circle */}
                                <div className="flex flex-col items-center">
                                    <div className={`
                                        relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                                        ${currentStep > step.number 
                                            ? 'bg-green-500 border-green-500' 
                                            : currentStep === step.number 
                                            ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-500/20' 
                                            : 'bg-gray-700 border-gray-600'
                                        }
                                    `}>
                                        {currentStep > step.number ? (
                                            <CheckCircle className="w-6 h-6 text-white" />
                                        ) : (
                                            <span className={`
                                                text-sm font-bold
                                                ${currentStep === step.number ? 'text-white' : 'text-gray-400'}
                                            `}>
                                                {step.number}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <div className={`
                                            text-sm font-medium
                                            ${currentStep >= step.number ? 'text-white' : 'text-gray-500'}
                                        `}>
                                            {step.title}
                                        </div>
                                        <div className="text-xs text-gray-500 hidden sm:block">
                                            {step.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className={`
                                        flex-1 h-0.5 mx-2 transition-all duration-300
                                        ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-700'}
                                    `} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    {/* Step Content */}
                    <div className="p-8">
                        {renderStep()}
                    </div>

                    {/* Footer Info */}
                    <div className="bg-gray-900/50 border-t border-gray-700 px-8 py-4">
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-gray-400">
                                Step {currentStep} of {steps.length}
                            </div>
                            <div className="text-gray-500">
                                © 2025 Mana XC | Built on the Hybrid Database Model
                            </div>
                        </div>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        Need help? Contact support or check the documentation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminImportPage;
