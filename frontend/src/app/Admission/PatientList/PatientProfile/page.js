'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  DollarSign,
  FileText,
  Pill,
  Stethoscope,
  AlertTriangle,
  Search,
  Calendar,
  Clock,
  Briefcase,
  ChevronDown,
  Activity,
  UserCheck,
  Building2
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

function PatientProfileContent() {
  const searchParams = useSearchParams();
  const memberNumber = searchParams.get('id');

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');
  const [headerSearchId, setHeaderSearchId] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState('diagnoses');

  // Accordion expand/collapse state for Clinical Timeline
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (idx) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchSubmit = (idToSearch) => {
    const cleanId = idToSearch.trim();
    if (cleanId) {
      window.location.href = `/Admission/PatientList/PatientProfile?id=${encodeURIComponent(cleanId)}`;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleSearchSubmit(searchId);
  };

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    handleHeaderSearchSubmit(headerSearchId);
  };

  const handleHeaderSearchSubmit = (idToSearch) => {
    const cleanId = idToSearch.trim();
    if (cleanId) {
      window.location.href = `/Admission/PatientList/PatientProfile?id=${encodeURIComponent(cleanId)}`;
    }
  };

  useEffect(() => {
    if (!memberNumber) {
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_URL}/api/admission/patient/${encodeURIComponent(memberNumber)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Patient record not found in system.');
          }
          throw new Error('Failed to load patient profile.');
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error('Patient data response is incomplete.');
        }

        setPatient(result.data);
      } catch (err) {
        console.error('Patient profile error:', err);
        setError(err.message || 'Failed to load patient profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [memberNumber]);

  const fmtMoney = (val) => {
    if (!isMounted) return `$${Number(val || 0).toFixed(2)}`;
    return `$${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getRiskBadgeStyles = (category) => {
    switch (category) {
      case 'High Risk':
        return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/10';
      case 'Medium Risk':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10';
      case 'Low Risk':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const parseDateValue = (d) => {
    if (!d) return 0;
    const str = String(d).trim();
    if (/^\d{6}$/.test(str)) {
      const yr = str.substring(0, 4);
      const mo = str.substring(4, 6);
      return new Date(`${yr}-${mo}-01`).getTime() || 0;
    }
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  };

  const formatDisplayDate = (d) => {
    if (!d) return 'N/A';
    const str = String(d).trim();
    if (/^\d{6}$/.test(str)) {
      const yr = str.substring(0, 4);
      const moIndex = parseInt(str.substring(4, 6), 10) - 1;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[moIndex] || ''} ${yr}`;
    }
    return str;
  };

  // Grouped unique diagnoses for the right tab
  const diagnoses = Array.isArray(patient?.Diagnoses) ? patient.Diagnoses : [];

  // Medications list from Fact_pharmacyClaims
  const medications = Array.isArray(patient?.Medications) ? patient.Medications : [];

  // Medical claims for the left Clinical Timeline & Procedure tab
  const rawEncounters = useMemo(() => {
    if (Array.isArray(patient?.Medical_History) && patient.Medical_History.length > 0) {
      return patient.Medical_History;
    }
    return [];
  }, [patient]);

  // Sort encounters chronologically descending (latest on top)
  const sortedMedicalHistory = useMemo(() => {
    if (!rawEncounters.length) return [];
    return [...rawEncounters].sort((a, b) => {
      const dateA = a.SERVICE_DATE || a.Year_month || a.DATE || '';
      const dateB = b.SERVICE_DATE || b.Year_month || b.DATE || '';
      return parseDateValue(dateB) - parseDateValue(dateA);
    });
  }, [rawEncounters]);

  const lastPcpFullName = [
    patient?.Last_PCP_Encountered_First_Name,
    patient?.Last_PCP_Encountered_Last_Name
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'N/A';

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading member profile...</p>
        </div>
      </div>
    );
  }

  if (!memberNumber && !patient) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-slate-50/60 px-4 py-12">
        <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 sm:p-10 text-center space-y-6 relative overflow-hidden">
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-50 to-indigo-50 border border-sky-100 flex items-center justify-center shadow-xs">
            <Search size={28} className="text-sky-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Member Profile Search
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
              Please enter a Member ID to view Member details.
            </p>
          </div>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="e.g. 80492..."
                className="w-full pl-11 pr-28 py-3.5 text-sm font-medium border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 bg-slate-50/50 hover:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                autoFocus
              />
              <Search size={18} className="absolute left-4 text-slate-400" />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-xl transition-all shadow-sm"
              >
                Search
              </button>
            </div>
          </form>
          <div className="pt-4 border-t border-slate-100">
            <a
              href="/Admission/PatientList"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-600 transition group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Return to Member List
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 px-4">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Unable to Load Member Profile</h2>
            <p className="text-sm text-slate-500">{error || 'Patient information could not be found.'}</p>
          </div>
          <a
            href="/Admission/PatientList"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft size={15} />
            Back to Member List
          </a>
        </div>
      </div>
    );
  }

  // 7 tabs sequence: Diagnoses -> Medication -> Procedure -> Clinical -> Risk -> Costs -> Administrative
  const tabs = [
    { id: 'diagnoses', label: 'Diagnoses History', icon: FileText, count: diagnoses.length },
    { id: 'medication', label: 'Medication', icon: Pill, count: medications.length },
    { id: 'procedure', label: 'Procedure', icon: Activity, count: sortedMedicalHistory.length },
    { id: 'clinical', label: 'Clinical Utilization', icon: Stethoscope },
    { id: 'risk', label: 'Risk & Admission Prediction', icon: ShieldAlert },
    { id: 'costs', label: 'Costs & Claims', icon: DollarSign },
    { id: 'admin', label: 'Administrative', icon: Briefcase }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 h-full max-w-[1700px] mx-auto">
      {/* Top Search & Navigation Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <form onSubmit={handleHeaderSearch} className="relative flex items-center w-full sm:w-72">
          <input
            type="text"
            value={headerSearchId}
            onChange={(e) => setHeaderSearchId(e.target.value)}
            placeholder="Search Member ID..."
            className="w-full pl-9 pr-16 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
          <Search size={14} className="absolute left-3 text-slate-400" />
          <button
            type="submit"
            className="absolute right-1 px-2.5 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.97] rounded-lg transition-all"
          >
            Search
          </button>
        </form>

        <a
          href="/Admission/PatientList"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition ml-auto"
        >
          <ArrowLeft size={15} />
          Back to Member List
        </a>
      </div>

      {/* Main Two-Column View */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* ================= LEFT COLUMN: STICKY MEMBER DETAILS & ACCORDION CLINICAL TIMELINE ================= */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 flex flex-col gap-4">
          
          {/* Member Card */}
          <aside className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 shrink-0">
            <div className="flex flex-col items-center text-center space-y-2 pt-0.5">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-black text-lg flex items-center justify-center shadow-sm shadow-sky-500/20">
                {(patient.Member_Name && patient.Member_Name !== 'N/A'
                  ? patient.Member_Name.charAt(0)
                  : patient.Member_Number?.toString().charAt(0) || 'M'
                ).toUpperCase()}
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {patient.Member_Name && patient.Member_Name !== 'N/A'
                    ? patient.Member_Name
                    : `Member #${patient.Member_Number}`}
                </h2>
                <p className="text-[11px] font-semibold text-slate-400">
                  Member ID: #{patient.Member_Number}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getRiskBadgeStyles(
                    patient.Risk_Category
                  )}`}
                >
                  {patient.Risk_Category || 'N/A'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                    patient.Actual_Admission_Status === 'Admission'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {patient.Actual_Admission_Status || 'No Admission'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Gender</span>
                <span className="font-bold text-slate-800">{patient.Gender || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Age</span>
                <span className="font-bold text-slate-800">{patient.Age ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium">Tier</span>
                <span className="font-bold text-slate-800 text-right">{patient.Tier || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Capitation</span>
                <span className="font-bold text-slate-800">{patient.Capitation ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Unique Claims</span>
                <span className="font-bold text-slate-800">{patient.Unique_Claims ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Unique Providers</span>
                <span className="font-bold text-slate-800">{patient.Unique_Providers ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium">Source File</span>
                <span className="font-bold text-slate-800 text-right break-all">
                  {patient.Source_File_Name || 'N/A'}
                </span>
              </div>
            </div>
          </aside>

          {/* Clinical Timeline Card with Accordion Expand/Collapse */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col h-[420px] sm:h-[480px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="text-sky-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Clinical Timeline
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {sortedMedicalHistory.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pt-2 space-y-2">
              {sortedMedicalHistory.length > 0 ? (
                sortedMedicalHistory.map((item, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const providerName = [
                    item.SERVICE_PROVIDER_FIRST_NAME,
                    item.SERVICE_PROVIDER_LAST_NAME
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .trim();

                  return (
                    <div
                      key={`timeline-row-${idx}`}
                      className="border-b border-slate-100 pb-2 last:border-0"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpand(idx);
                          }
                        }}
                        className={`w-full text-left flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer select-none ${
                          isExpanded
                            ? 'bg-sky-50/80 border border-sky-200'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 transition-colors ${
                            isExpanded ? 'bg-sky-600 ring-2 ring-sky-300' : 'bg-sky-500'
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="font-bold text-slate-900 text-xs tracking-tight truncate">
                              {item.SERVICE_SUB_CATEGORY || 'VISIT / ENCOUNTER'}
                            </p>
                            <ChevronDown
                              size={15}
                              className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                                isExpanded ? 'rotate-180 text-sky-600 font-bold' : ''
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                            {item.PROCEDURE_CODE_2 ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200">
                                {item.PROCEDURE_CODE_2}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">No code</span>
                            )}
                            <span className="text-slate-500 font-semibold text-[11px]">
                              {formatDisplayDate(item.SERVICE_DATE)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-1.5 mx-1 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-slate-500 text-[11px] font-medium">
                              Place of Service:
                            </span>
                            <span className="font-semibold text-slate-800 text-right">
                              {item.PLACE_OF_SERVICE || 'N/A'}
                            </span>
                          </div>

                          {providerName && (
                            <div className="flex justify-between items-start gap-2 pt-1.5 border-t border-slate-200/60">
                              <span className="text-slate-500 text-[11px] font-medium">
                                Provider:
                              </span>
                              <span className="font-bold text-slate-900 text-right">
                                {providerName}
                              </span>
                            </div>
                          )}

                          {item.PAID_PROVIDER_LAST_NAME && (
                            <div className="flex justify-between items-start gap-2 pt-1.5 border-t border-slate-200/60">
                              <span className="text-slate-500 text-[11px] font-medium">
                                Paid To:
                              </span>
                              <span className="font-semibold text-slate-700 text-right">
                                {item.PAID_PROVIDER_LAST_NAME}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-10">
                  No Clinical Timeline claims available.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: TABS WITH INDEPENDENT SCROLLBAR ================= */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden max-h-[calc(100vh-6.5rem)] lg:sticky lg:top-4">
          
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 bg-white z-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'border-sky-600 text-sky-600 bg-sky-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Area for Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* TAB 1: DIAGNOSES HISTORY */}
            {activeTab === 'diagnoses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={17} className="text-sky-600" />
                    <h3 className="font-bold text-sm text-slate-900">Diagnoses History</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                    {diagnoses.length} Records
                  </span>
                </div>

                {diagnoses.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {diagnoses.map((diagnosis, index) => (
                      <div
                        key={`${diagnosis.DIAGNOSIS || 'diag'}-${index}`}
                        className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                              {diagnosis.DIAGNOSIS || 'N/A'}
                            </span>
                            {diagnosis.DIAGNOSIS_TYPE && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                                {diagnosis.DIAGNOSIS_TYPE}
                              </span>
                            )}
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {diagnosis.SHORT_DESCRIPTION ||
                                diagnosis.LONG_DESCRIPTION ||
                                diagnosis.DIAGNOSIS ||
                                'Diagnosis Record'}
                            </h4>
                          </div>

                          {diagnosis.LONG_DESCRIPTION && (
                            <p className="text-xs text-slate-500 leading-relaxed font-normal">
                              {diagnosis.LONG_DESCRIPTION}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-xs shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-5">
                          <div className="text-left md:text-right">
                            <span className="text-[11px] text-slate-400 font-medium block">Total Visits</span>
                            <span className="font-bold text-slate-800 text-sm">
                              {diagnosis.Total_Visits ?? 1}
                            </span>
                          </div>
                          <div className="text-left md:text-right">
                            <span className="text-[11px] text-slate-400 font-medium block">Last Visit</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" />
                              {diagnosis.Last_Visit || diagnosis.Year_month || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">No diagnosis records found.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MEDICATION (Updated with Drug Code & Dosage Strength, Pkg Size removed) */}
            {activeTab === 'medication' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Pill size={18} className="text-purple-600" />
                    <h3 className="font-bold text-sm text-slate-900">Pharmacy & Medications</h3>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                    {medications.length} Prescriptions
                  </span>
                </div>

                {medications.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50/80 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3.5 py-3">Drug Code</th>
                          <th className="px-3 py-3">Drug Name</th>
                          <th className="px-3 py-3">Strength</th>
                          <th className="px-3 py-3">Rx #</th>
                          <th className="px-3 py-3">Fill Date</th>
                          <th className="px-3 py-3 text-center">Days Supply</th>
                          <th className="px-3 py-3">Prescribing Physician</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                        {medications.map((med, index) => {
                          const prescriber = [
                            med.PRESC_PHYSICIAN_FIRST_NAME,
                            med.PRESC_PHYSICIAN_LAST_NAME
                          ]
                            .filter(Boolean)
                            .join(' ')
                            .trim() || 'N/A';

                          return (
                            <tr
                              key={`med-row-${index}`}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              {/* 1. Drug Code */}
                              <td className="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] font-bold text-slate-700">
                                {med.DRUG_CODE ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                    {med.DRUG_CODE}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">N/A</span>
                                )}
                              </td>

                              {/* 2. Drug Name */}
                              <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                                {med.DRUG_NAME || 'N/A'}
                              </td>

                              {/* 3. Strength (Dosage Strength - combined or suppressed) */}
                              <td className="px-3 py-3 whitespace-nowrap text-slate-700 font-semibold">
                                {med.DOSAGE_STRENGTH ? (
                                  <span>{med.DOSAGE_STRENGTH}</span>
                                ) : null}
                              </td>

                              {/* 4. Rx # */}
                              <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-700 font-semibold">
                                {med.PRESCRIPTION_NUMBER || 'N/A'}
                              </td>

                              {/* 5. Fill Date */}
                              <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                                {med.PRESCRIPTION_FILL_DATE || 'N/A'}
                              </td>

                              {/* 6. Days Supply */}
                              <td className="px-3 py-3 whitespace-nowrap text-center font-bold text-slate-700">
                                {med.DAYS_SUPPLY ?? 'N/A'}
                              </td>

                              {/* 7. Prescribing Physician */}
                              <td className="px-3 py-3 whitespace-nowrap text-slate-700 font-semibold">
                                {prescriber}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
                    <Pill size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">
                      No medication claims found for this patient.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PROCEDURE (NEW TAB AFTER MEDICATION) */}
            {activeTab === 'procedure' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-teal-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Procedures & Encounters</h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Showing all clinical procedures sorted with latest records first
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                    {sortedMedicalHistory.length} Encounters
                  </span>
                </div>

                {sortedMedicalHistory.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50/80 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3.5 py-3">Service Date</th>
                          <th className="px-3 py-3">Procedure Code</th>
                          <th className="px-3.5 py-3">Category / Encounter</th>
                          <th className="px-3 py-3">Place of Service</th>
                          <th className="px-3 py-3">Rendering Provider</th>
                          <th className="px-3 py-3">Paid Provider</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                        {sortedMedicalHistory.map((proc, index) => {
                          const renderingProvider = [
                            proc.SERVICE_PROVIDER_FIRST_NAME,
                            proc.SERVICE_PROVIDER_LAST_NAME
                          ]
                            .filter(Boolean)
                            .join(' ')
                            .trim() || 'N/A';

                          return (
                            <tr
                              key={`proc-row-${index}`}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <Calendar size={13} className="text-slate-400 shrink-0" />
                                  {formatDisplayDate(proc.SERVICE_DATE)}
                                </span>
                              </td>

                              <td className="px-3 py-3 whitespace-nowrap">
                                {proc.PROCEDURE_CODE_2 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-mono font-bold text-[11px] border border-teal-200">
                                    {proc.PROCEDURE_CODE_2}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">N/A</span>
                                )}
                              </td>

                              <td className="px-3.5 py-3 text-slate-800 font-bold max-w-[240px] truncate">
                                {proc.SERVICE_SUB_CATEGORY || 'VISIT / ENCOUNTER'}
                              </td>

                              <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 size={13} className="text-slate-400 shrink-0" />
                                  {proc.PLACE_OF_SERVICE || 'N/A'}
                                </span>
                              </td>

                              <td className="px-3 py-3 whitespace-nowrap text-slate-800 font-semibold">
                                <span className="inline-flex items-center gap-1.5">
                                  <UserCheck size={13} className="text-teal-600 shrink-0" />
                                  {renderingProvider}
                                </span>
                              </td>

                              <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
                                {proc.PAID_PROVIDER_LAST_NAME || 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
                    <Activity size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">
                      No procedure records found for this patient.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CLINICAL UTILIZATION */}
            {activeTab === 'clinical' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Stethoscope size={18} className="text-blue-500" />
                  <h3 className="font-bold text-sm text-slate-800">Clinical Utilization</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Office Visits:</span>
                    <span className="font-bold text-slate-800">{patient.Office_Visits ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Outpatient Visits:</span>
                    <span className="font-bold text-slate-800">{patient.Outpatient_Visits ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">ER Visits:</span>
                    <span className="font-bold text-red-600">{patient.ER_Visits ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Dental Visits:</span>
                    <span className="font-bold text-slate-800">{patient.Dental_Visits ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Unique Diagnoses:</span>
                    <span className="font-bold text-slate-800">{patient.Unique_Diagnosis ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Unique Procedures:</span>
                    <span className="font-bold text-slate-800">{patient.Unique_Procedures ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Unique Claims:</span>
                    <span className="font-bold text-slate-800">{patient.Unique_Claims ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Unique Providers:</span>
                    <span className="font-bold text-slate-800">{patient.Unique_Providers ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Last PCP Name:</span>
                    <span className="font-bold text-slate-800">{lastPcpFullName}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Last PCP ID:</span>
                    <span className="font-mono font-bold text-slate-800">{patient.Last_PCP_Encountered_Number || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Last PCP Encounter Date:</span>
                    <span className="font-bold text-slate-800">{patient.Last_PCP_Encounter_Date || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RISK & ADMISSION PREDICTION */}
            {activeTab === 'risk' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldAlert size={18} className="text-red-500" />
                  <h3 className="font-bold text-sm text-slate-800">Risk & Admission Prediction</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Admission Probability:</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {patient.Admission_prob_percentage ?? 'N/A'}
                      {patient.Admission_prob_percentage != null && '%'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Risk Score:</span>
                    <span className="font-bold text-slate-800">{patient.Risk_Score ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Model Status:</span>
                    <span className="font-semibold text-slate-800">{patient.Model_Admission_Status || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Actual Status:</span>
                    <span className="font-semibold text-slate-800">{patient.Actual_Admission_Status || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Prediction Result:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md border ${
                        patient.Prediction_Result === 'True Positive'
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                          : 'text-slate-700 bg-slate-50 border-slate-200'
                      }`}
                    >
                      {patient.Prediction_Result || 'N/A'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Prediction Correct:</span>
                    <span className="font-semibold text-slate-800">{patient.Prediction_Correct ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Target:</span>
                    <span className="font-semibold text-slate-800">{patient.Target ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Target Predicted:</span>
                    <span className="font-semibold text-slate-800">{patient.target_predicted ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: COSTS & CLAIMS */}
            {activeTab === 'costs' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <DollarSign size={18} className="text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-800">Costs & Claims</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Total Medical Cost:</span>
                    <span className="font-extrabold text-slate-900">{fmtMoney(patient.Total_Medical_Cost)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Average Claim Cost:</span>
                    <span className="font-bold text-slate-800">{fmtMoney(patient.Avg_Claim_Cost)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Max Claim Cost:</span>
                    <span className="font-bold text-slate-800">{fmtMoney(patient.Max_Claim_Cost)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Pharmacy Cost:</span>
                    <span className="font-bold text-slate-800">{fmtMoney(patient.Pharmacy_Cost)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Dental Cost:</span>
                    <span className="font-bold text-slate-800">{fmtMoney(patient.Dental_Cost)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Total Medical Claims:</span>
                    <span className="font-bold text-slate-800">{patient.Total_Medical_Claims ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">IPA Claims Budget:</span>
                    <span className="font-bold text-slate-800">{fmtMoney(patient.IPA_Claims_Budget)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ADMINISTRATIVE */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Briefcase size={18} className="text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-800">Administrative</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">PCP Number:</span>
                    <span className="font-bold text-slate-800">{patient.PCP_Number || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Group Number:</span>
                    <span className="font-bold text-slate-800">{patient.Group_Number || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Capitation:</span>
                    <span className="font-bold text-slate-800">{patient.Capitation ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Prescription Count:</span>
                    <span className="font-bold text-slate-800">{patient.Prescription_Count ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Unique Drugs:</span>
                    <span className="font-bold text-slate-800">{patient.Unique_Drugs ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Drug Classes:</span>
                    <span className="font-bold text-slate-800">{patient.Drug_Classes ?? 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Average Days Supply:</span>
                    <span className="font-bold text-slate-800">{patient.Avg_Days_Supply ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

export default function PatientProfile() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
        </div>
      }
    >
      <PatientProfileContent />
    </Suspense>
  );
}