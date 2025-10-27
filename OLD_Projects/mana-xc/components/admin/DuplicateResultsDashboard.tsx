// components/admin/DuplicateResultsDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface DuplicateRow {
    athlete_id: string;
    athlete_name: string;
    school_name: string;
    race_id: string;
    race_name: string;
    meet_name: string;
    meet_date: string;
    result_count: number;
    result_ids: string[]; // Array of UUIDs for the results
}

export default function DuplicateResultsDashboard() {
    const [duplicates, setDuplicates] = useState<DuplicateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchDuplicates();
    }, []);

    const fetchDuplicates = async () => {
        setLoading(true);
        setStatus('Fetching duplicate data...');
        try {
            const response = await fetch('/api/admin/duplicate-results');
            const result = await response.json();

            if (response.ok && result.success) {
                setDuplicates(result.duplicates || []);
                setStatus(`Found ${result.duplicates.length} duplicate result sets.`);
            } else {
                setStatus(`Error loading data: ${result.error}`);
            }
        } catch {
            setStatus('Network error during data retrieval.');
        } finally {
            setLoading(false);
        }
    };

    // New Function: Deletes all but one result from the duplicate set
    const resolveDuplicateSet = async (row: DuplicateRow) => {
        setStatus(`Resolving ${row.athlete_name} in ${row.race_name}...`);

        // CRITICAL LOGIC: Identify the result to KEEP (e.g., the first one in the array)
        // Identify the results to DELETE (all others)
        const resultsToDelete = row.result_ids.slice(1);

        // Call a dedicated API endpoint to perform the resolution in a transaction
        try {
            const response = await fetch('/api/admin/resolve-duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    race_id: row.race_id,
                    results_to_delete: resultsToDelete,
                    admin_action: 'KEEP_FIRST_RESULT',
                    // The backend function will handle the race count update and view refresh
                }),
            });
            
            if (response.ok) {
                // Update local state: remove the resolved row
                setDuplicates(prev => prev.filter(d => d.race_id !== row.race_id || d.athlete_id !== row.athlete_id));
                setStatus(`Successfully resolved duplicate for ${row.athlete_name}. ${resultsToDelete.length} records deleted.`);
                
                // IMPORTANT: In a real environment, you'd trigger the full refresh here.
                // For now, we manually state the refresh is needed.
                // REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
                
            } else {
                const errorResult = await response.json();
                setStatus(`Resolution failed: ${errorResult.error}`);
            }
        } catch {
            setStatus('Network error during resolution.');
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading Integrity Report...</div>;
    }

    if (duplicates.length === 0) {
        return <div className="text-center p-10 text-mana-green-400"><CheckCircle className="w-8 h-8 mx-auto mb-3" /> All data is clean. Zero duplicates found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-mana-red-400">
                    <AlertTriangle className="w-5 h-5 inline mr-2" /> {duplicates.length} Duplicate Sets Found
                </h3>
                <Button onClick={fetchDuplicates} variant="outline" className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-100">
                    Re-Run Report
                </Button>
            </div>
            
            <p className="text-sm text-gray-400">{status}</p>

            <Table className="bg-gray-700 rounded-lg overflow-hidden">
                <TableHeader>
                    <TableRow className="bg-gray-600 hover:bg-gray-600 border-gray-500">
                        <TableHead className="w-[200px] text-white">Athlete</TableHead>
                        <TableHead className="text-white">Meet / Race</TableHead>
                        <TableHead className="text-mana-red-400">Count</TableHead>
                        <TableHead className="w-[150px] text-right text-white">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {duplicates.map((row) => (
                        <TableRow key={`${row.athlete_id}-${row.race_id}`} className="border-gray-600 hover:bg-gray-650">
                            <TableCell className="font-medium text-white">
                                {row.athlete_name}
                                <div className="text-xs text-gray-400">{row.school_name}</div>
                            </TableCell>
                            <TableCell>
                                {row.meet_name} - {row.race_name}
                                <div className="text-xs text-gray-400">{row.meet_date}</div>
                            </TableCell>
                            <TableCell className="font-bold text-lg text-mana-red-400">
                                {row.result_count}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    onClick={() => resolveDuplicateSet(row)}
                                    size="sm"
                                    className="bg-mana-red-500 hover:bg-mana-red-600 text-white"
                                >
                                    Auto-Resolve ({row.result_count - 1} Delete)
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// NOTE: You will need to create the /api/admin/resolve-duplicate endpoint
// and the necessary SQL function for the resolution logic.