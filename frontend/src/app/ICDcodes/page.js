'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, ChevronDown, ArrowUpRight, RefreshCw, AlertTriangle } from 'lucide-react';
import MemberDetailsDrawer from '@/components/MemberDetailsDrawer';

export default function ICDCodesPage() {
  const [data, setData] = useState([]);
  const [conditionsList, setConditionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [conditionCategory, setConditionCategory] = useState('All conditions');
  const [selectedMember, setSelectedMember] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });

  // Fetch unique conditions for dropdown once on mount
  useEffect(() => {
    const fetchConditions = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/icd/conditions');
        const result = await res.json();
        if (result.success) {
          setConditionsList(result.conditions || []);
        }
      } catch (err) {
        console.error('Failed to load condition dropdown list:', err);
      }
    };
    fetchConditions();
  }, []);

  // Debounce search term to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch registry data from backend
  const fetchRegistryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        condition: conditionCategory,
        page: currentPage.toString(),
        page_size: '25'
      });

      const response = await fetch(`http://localhost:8000/api/icd/registry?${queryParams}`);
      if (!response.ok) throw new Error('Failed to connect to backend server');

      const result = await response.json();
      if (!result.success) throw new Error(result.detail || 'Data retrieval failed');

      setData(result.data || []);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, conditionCategory, currentPage]);

  useEffect(() => {
    fetchRegistryData();
  }, [fetchRegistryData]);

  const handleConditionChange = (val) => {
    setConditionCategory(val);
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 lg:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Matching Original UI */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Member Readmission Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Filter and manage registered members based on readmission probabilities
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRegistryData}
              disabled={loading}
              className="p-1.5 rounded-full bg-white border border-slate-200/90 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>

            {/* Right Header Count Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-blue-50/80 border border-blue-100/60 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Showing {data.length} of {pagination.total_records}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar Matching Original UI */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* All Conditions Custom Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={conditionCategory}
              onChange={(e) => handleConditionChange(e.target.value)}
              className="appearance-none w-full sm:w-auto pl-4 pr-9 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs hover:bg-slate-50 transition-all max-w-xs truncate"
            >
              <option value="All conditions">All conditions</option>
              {conditionsList.map((cond, idx) => (
                <option key={idx} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Search Bar Input */}
          <div className="relative flex-1 w-full max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Member ID, Name, Claim, Diagnosis..."
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/90 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
          </div>

        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-medium shadow-2xs">
            <AlertTriangle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registry Table Matching Original UI */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Member ID</th>
                  <th className="py-3.5 px-5">Member Name</th>
                  <th className="py-3.5 px-5">Diagnosis</th>
                  <th className="py-3.5 px-5">Claim Number</th>
                  <th className="py-3.5 px-5">Paid Date</th>
                  <th className="py-3.5 px-5 min-w-[280px]">Long Description</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      <RefreshCw size={20} className="animate-spin mx-auto text-blue-600 mb-2" />
                      Loading member records...
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((row, idx) => {
                    const longDesc = row.LONG_DESCRIPTION || row.DESCRIPTION || '';
                    return (
                      <tr 
                        key={`${row.CLAIM_NUMBER || row.MEMBER_NUMBER}-${idx}`} 
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        {/* Member ID with Hover Blue Accent & Arrow */}
                        <td 
                          className="py-3.5 px-5 font-bold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
                          onClick={() => setSelectedMember(row)}
                        >
                          <span>{row.MEMBER_NUMBER}</span>
                          <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                        </td>
                        
                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                          {row.MEMBER_NAME || 'N/A'}
                        </td>
                        
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            {row.DIAGNOSIS}
                          </span>
                        </td>
                        
                        <td className="py-3.5 px-5 font-mono font-medium text-slate-600">
                          {row.CLAIM_NUMBER}
                        </td>
                        
                        <td className="py-3.5 px-5 font-medium text-slate-600">
                          {row.PAID_DATE}
                        </td>
                        
                        <td className="py-3.5 px-5 text-slate-600 leading-relaxed font-medium">
                          {longDesc}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination Matching Original UI */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium bg-white">
            <span>
              Showing <strong className="text-slate-800">{data.length}</strong> of{' '}
              <strong className="text-slate-800">{pagination.total_records}</strong> records
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={!pagination.has_previous || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="px-2 font-bold text-slate-700">
                Page {currentPage} of {pagination.total_pages || 1}
              </span>

              <button 
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!pagination.has_next || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Side Drawer Component */}
      <MemberDetailsDrawer 
        member={selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />
    </div>
  );
}