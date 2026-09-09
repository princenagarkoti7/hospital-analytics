'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, ChevronDown, ArrowUpRight, RefreshCw, AlertTriangle } from 'lucide-react';
import MemberDetailsDrawer from '@/components/MemberDetailsDrawer';
import ExportCSVButton from '@/components/ExportCSVButton';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

  // Unique conditions list fetch
  useEffect(() => {
    const fetchConditions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/icd/conditions`);
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

  // Debounce search (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch API data (100 per page)
  const fetchRegistryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        condition: conditionCategory,
        page: currentPage.toString(),
        page_size: '100'
      });

      const response = await fetch(`${API_BASE_URL}/api/icd/registry?${queryParams}`);
      if (!response.ok) throw new Error('Failed to connect to backend server');

      const result = await response.json();
      if (!result.success) throw new Error(result.detail || 'Data retrieval failed');

      setData(result.data || []);
      setPagination(result.pagination || {
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });
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
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              HCC Version & Provider Analytics
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage member diagnoses, PCP details, Service & Paid Providers, and CMS HCC V24/V28 transitions
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Refresh Button */}
            <button
              onClick={fetchRegistryData}
              disabled={loading}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
            
            <ExportCSVButton 
              endpoint="/api/icd/export"
              queryParams={{
                search: debouncedSearch,
                condition: conditionCategory
              }}
              fileNamePrefix="ICD_Registry_Report"
              totalRecords={pagination.total_records}
              buttonText="Export CSV"
            />

            {/* Showing Records Badge */}
            <div className="inline-flex items-center h-9 gap-2 px-3.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Showing {data.length} of {pagination.total_records}
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-3">

          {/* Condition Dropdown */}
          <div className="relative w-full sm:w-72 shrink-0">
            <select
              value={conditionCategory}
              onChange={(e) => handleConditionChange(e.target.value)}
              className="appearance-none w-full h-9 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition truncate"
            >
              <option value="All conditions">All conditions</option>
              {conditionsList.map((cond, idx) => (
                <option key={idx} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by PCP, Service/Paid Provider, Member ID, Patient Name, Claim, HCC Code..."
              className="w-full h-9 pl-9 pr-4 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>

        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium">
            <AlertTriangle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formatted Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 min-w-[160px]">PCP Details</th>
                  <th className="py-3 px-4 min-w-[180px]">Service Provider</th>
                  <th className="py-3 px-4 min-w-[170px]">Paid Provider</th>
                  <th className="py-3 px-4 min-w-[160px]">Member Info</th>
                  <th className="py-3 px-4 min-w-[110px]">Diagnosis</th>
                  <th className="py-3 px-4 min-w-[120px]">HCC V24</th>
                  <th className="py-3 px-4 min-w-[140px]">HCC V28</th>
                  <th className="py-3 px-4 min-w-[130px]">Claim Details</th>
                  <th className="py-3 px-4 min-w-[250px]">Description</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 font-medium">
                      <RefreshCw size={22} className="animate-spin mx-auto text-blue-600 mb-2" />
                      Loading records from database...
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((row, idx) => {
                    const isV28Removed = String(row.TARGET_HCC_V28 || '').toLowerCase().includes('removed');

                    return (
                      <tr 
                        key={`${row.CLAIM_NUMBER || row.MEMBER_NUMBER}-${idx}`} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* PCP Details */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800 leading-tight">
                            {row.PCP_FULL_NAME?.trim() ? row.PCP_FULL_NAME : 'N/A'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            ID: <span className="font-semibold text-slate-700">{row.PCP_NUMBER || 'N/A'}</span>
                          </p>
                        </td>

                        {/* Service Provider */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800 leading-tight">
                            {row.SERVICE_PROVIDER_FULL_NAME?.trim() ? row.SERVICE_PROVIDER_FULL_NAME : 'N/A'}
                          </p>
                        </td>

                        {/* Paid Provider */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-700 leading-tight">
                            {row.PAID_PROVIDER_NAME || 'N/A'}
                          </p>
                        </td>

                        {/* Member Info */}
                        <td className="py-3 px-4">
                          <button 
                            type="button"
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1 focus:outline-none"
                            onClick={() => setSelectedMember(row)}
                          >
                            <span>{row.MEMBER_NUMBER}</span>
                            <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                            {row.MEMBER_NAME || 'N/A'}
                          </p>
                        </td>

                        {/* Diagnosis */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100">
                            {row.DIAGNOSIS}
                          </span>
                        </td>

                        {/* HCC V24 Code */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {row.TARGET_HCC_V24 || 'N/A'}
                          </span>
                        </td>

                        {/* HCC V28 Code */}
                        <td className="py-3 px-4">
                          {isV28Removed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-semibold">
                              Not Risk Adjustable with V28
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">
                              {row.TARGET_HCC_V28 || 'N/A'}
                            </span>
                          )}
                        </td>

                        {/* Claim & Date */}
                        <td className="py-3 px-4">
                          <p className="font-mono font-medium text-slate-700 leading-tight">
                            {row.CLAIM_NUMBER}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {row.PAID_DATE}
                          </p>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 text-slate-600 leading-snug font-medium text-[11px]">
                          {row.DESCRIPTION || row.LONG_DESCRIPTION || 'No description available'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No records found matching your filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium bg-white">
            <span>
              Showing <strong className="text-slate-800">{data.length}</strong> of{' '}
              <strong className="text-slate-800">{pagination.total_records}</strong> records
            </span>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={!pagination.has_previous || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-2.5 font-bold text-slate-700">
                Page {currentPage} of {pagination.total_pages || 1}
              </span>

              <button 
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!pagination.has_next || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Side Drawer Component */}
      {selectedMember && (
        <MemberDetailsDrawer 
          member={selectedMember} 
          selectedMemberId={selectedMember.MEMBER_NUMBER}
          onClose={() => setSelectedMember(null)} 
        />
      )}
    </div>
  );
}