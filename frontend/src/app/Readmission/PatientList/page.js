'use client';

import React, { useEffect, useState } from 'react';
import ExportCSVButton from '@/components/ExportCSVButton';
import {
  Search,
  Filter,
  Users,
  User,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  XCircle,
  X,
  ShieldAlert,
  ArrowLeft,
  Clock
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';
const PAGE_SIZE = 250;

export default function ReadmissionPatientList() {
  // Filter States
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Data & Pagination
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Global Stats
  const [stats, setStats] = useState({
    total_registrations: 0,
    high_risk_cohorts: 0,
    confirmed_readmissions: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Debounce search input to avoid API calls on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 2. Fetch Patients (single source of truth for API calls)
  useEffect(() => {
    const controller = new AbortController();

    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: PAGE_SIZE.toString(),
          search: debouncedSearch.trim(),
          condition: selectedCondition,
          status: selectedStatus
        });

        const response = await fetch(
          `${API_URL}/api/readmission/patients?${params.toString()}`,
          {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store'
          }
        );

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to load readmission data');
        }

        setPatients(Array.isArray(result.data) ? result.data : []);
        setStats({
          total_registrations: result.stats?.total_registrations || 0,
          high_risk_cohorts: result.stats?.high_risk_cohorts || 0,
          confirmed_readmissions: result.stats?.confirmed_readmissions || 0
        });
        setTotalRecords(result.pagination?.total_records || 0);
        setTotalPages(result.pagination?.total_pages || 0);
      } catch (err) {
        if (err.name === 'AbortError') return;

        console.error('Error fetching readmission patients:', err);
        setPatients([]);
        setStats({ total_registrations: 0, high_risk_cohorts: 0, confirmed_readmissions: 0 });
        setTotalRecords(0);
        setTotalPages(0);
        setError('Unable to load patient data from the server.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPatients();

    return () => controller.abort();
  }, [currentPage, debouncedSearch, selectedCondition, selectedStatus]);

  // Handlers
  const handleConditionChange = (e) => {
    setSelectedCondition(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCondition('ALL');
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  const getRiskBadgeStyles = (category) => {
    switch (category) {
      case 'High Risk':
        return 'bg-red-50 text-red-700 border-red-200/80 ring-1 ring-red-500/10';
      case 'Medium Risk':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/10';
      case 'Low Risk':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage || loading) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    if (totalPages <= 1) return [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    const pages = [];
    for (let page = startPage; page <= endPage; page++) {
      pages.push(page);
    }
    return pages;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-6 text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Readmission Intelligence Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Real-time patient stratification & hospital readmission probability records
            </p>
          </div>
          <a
            href="/Readmission"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-100 transition"
          >
            <ArrowLeft size={16} />
            Back
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Registrations
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {loading ? '...' : stats.total_registrations.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Active Member Database</p>
            </div>
            <div className="p-3 bg-blue-50/80 text-blue-600 rounded-2xl border border-blue-100">
              <Users size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                High Risk Cohorts
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-red-600">
                  {loading ? '...' : stats.high_risk_cohorts.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Filtered Population
                </span>
              </div>
              <p className="text-xs text-red-500 font-semibold">High Risk Members</p>
            </div>
            <div className="p-3 bg-red-50/80 text-red-600 rounded-2xl border border-red-100">
              <ShieldAlert size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Confirmed Readmissions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-700">
                  {loading ? '...' : stats.confirmed_readmissions.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Filtered Population
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium font-semibold">Confirmed Readmissions</p>
            </div>
            <div className="p-3 bg-blue-50/80 text-blue-700 rounded-2xl border border-blue-100">
              <Activity size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Registry Table & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-4 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Member Readmission Registry</h2>
              <p className="text-xs text-slate-500">
                Filter and manage registered members based on readmission probabilities
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(selectedCondition !== 'ALL' || searchTerm || selectedStatus !== 'ALL') && (
                <button
                  onClick={handleResetFilters}
                  type="button"
                  className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-semibold transition"
                >
                  <X size={13} />
                  Reset Filters
                </button>
              )}
              <ExportCSVButton
                endpoint="/api/readmission/patients/export" // Update to your exact API export endpoint
                queryParams={{
                search: debouncedSearch,
                condition: selectedCondition,
                status: selectedStatus
             }}
  fileNamePrefix="Readmission_Patients_Report"
  totalRecords={totalRecords}
/>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Showing {patients.length} of {totalRecords.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="relative md:col-span-5">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                placeholder="Search by Member ID..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            {/* Risk Select */}
            <div className="relative md:col-span-3">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Filter size={15} />
              </div>
              <select
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer"
                value={selectedCondition}
                onChange={handleConditionChange}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="High Risk">High Risk</option>
                <option value="Medium Risk">Medium Risk</option>
                <option value="Low Risk">Low Risk</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-4 flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 gap-1">
              {['ALL', 'Readmission', 'No Readmission'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedStatus === status
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-3.5 px-6">Member ID</th>
                <th className="py-3.5 px-4">Risk Category</th>
                <th className="py-3.5 px-4">Readmission Prob %</th>
                <th className="py-3.5 px-4">Time Window</th>
                <th className="py-3.5 px-4">Demographics</th>
                <th className="py-3.5 px-4">Plan Type</th>
                <th className="py-3.5 px-6">Actual Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="font-bold text-slate-600">Loading readmission records...</p>
                      <p className="text-xs text-slate-400">Loading {PAGE_SIZE} records at a time</p>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <User size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-600">No patient records found</p>
                      <p className="text-xs text-slate-400">Try changing your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={`${patient.Member_Number}-${index}`} className="hover:bg-blue-50/30 transition group">
                    <td className="py-4 px-6 font-bold">
                      <a
                        href={`/Readmission/PatientList/PatientProfile?id=${encodeURIComponent(
                          patient.Member_Number
                        )}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
                      >
                        {patient.Member_Number}
                        <ArrowUpRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getRiskBadgeStyles(
                          patient.Risk_Category
                        )}`}
                      >
                        {patient.Risk_Category || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 min-w-[42px]">
                          {Number(patient.Stage1_Admission_Prob_Pct || 0).toFixed(1)}%
                        </span>
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block border border-slate-200/60">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              Number(patient.Stage1_Admission_Prob_Pct || 0) > 60
                                ? 'bg-red-500'
                                : Number(patient.Stage1_Admission_Prob_Pct || 0) > 30
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.max(Number(patient.Stage1_Admission_Prob_Pct || 0), 0),
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {patient.Stage2_Predicted_Time_Window || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <span className="font-bold text-slate-800">{patient.Age ?? '-'}</span> yrs /{' '}
                      <span className="font-semibold">{patient.Gender || '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {patient.Tier || 'Standard'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border ${
                          patient.Actual_Readmission_Status === 'Readmission'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {patient.Actual_Readmission_Status === 'Readmission' ? (
                          <CheckCircle2 size={13} className="text-blue-600" />
                        ) : (
                          <XCircle size={13} className="text-slate-400" />
                        )}
                        {patient.Actual_Readmission_Status || 'No Readmission'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-700">{patients.length}</span> records on page{' '}
              <span className="font-bold text-slate-700">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-700">{totalPages}</span> ({totalRecords.toLocaleString()} total)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {currentPage > 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    className="w-9 h-9 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                  >
                    1
                  </button>
                  <span className="px-1 text-slate-400">...</span>
                </>
              )}

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 text-xs font-bold rounded-xl border transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(totalPages)}
                    className="w-9 h-9 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}