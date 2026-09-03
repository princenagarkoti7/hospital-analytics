'use client';

import React, { useEffect, useState, Suspense } from 'react';
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
  UserCheck,
  Sparkles
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

  // Consistent currency formatting across Server & Client (Fixed locale mismatch)
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

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            Loading member profile...
          </p>
        </div>
      </div>
    );
  }

  // Centered Search Screen (When ID is missing in URL)
  if (!memberNumber && !patient) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-slate-50/60 px-4 py-12">
        <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 sm:p-10 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-100 rounded-full blur-2xl opacity-70 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-70 pointer-events-none" />

          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-50 to-indigo-50 border border-sky-100 flex items-center justify-center shadow-xs">
            <Search size={28} className="text-sky-600" />
            <Sparkles size={14} className="absolute top-2 right-2 text-indigo-500" />
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
                className="absolute right-1.5 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Search</span>
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
            <h2 className="text-lg font-bold text-slate-900">
              Unable to Load Member Profile
            </h2>
            <p className="text-sm text-slate-500">
              {error || 'Patient information could not be found in the system.'}
            </p>
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

  const diagnoses = Array.isArray(patient.Diagnoses) ? patient.Diagnoses : [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-6 text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Updated Header Navigation Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Compact Quick Search Input on the Left */}
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
            className="absolute right-1 px-2.5 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.97] rounded-lg transition-all shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Back Button shifted to the Right */}
        <a
          href="/Admission/PatientList"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition ml-auto"
        >
          <ArrowLeft size={16} />
          Back to Member List
        </a>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserCheck size={20} className="text-sky-600" />
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Member #{patient.Member_Number}
              </h1>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium">
              Age:{' '}
              <span className="font-bold text-slate-700">
                {patient.Age ?? 'N/A'}
              </span>
              {' | '}
              Gender:{' '}
              <span className="font-bold text-slate-700">
                {patient.Gender || 'N/A'}
              </span>
              {' | '}
              Tier:{' '}
              <span className="font-bold text-slate-700">
                {patient.Tier || 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${getRiskBadgeStyles(
                patient.Risk_Category
              )}`}
            >
              {patient.Risk_Category || 'N/A'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                patient.Actual_Admission_Status === 'Admission'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Actual: {patient.Actual_Admission_Status || 'No Admission'}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-slate-500 font-medium">Source File</p>
            <p className="mt-0.5 font-bold text-slate-800 break-all">
              {patient.Source_File_Name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Unique Claims</p>
            <p className="mt-0.5 font-bold text-slate-800">
              {patient.Unique_Claims ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Unique Providers</p>
            <p className="mt-0.5 font-bold text-slate-800">
              {patient.Unique_Providers ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Capitation</p>
            <p className="mt-0.5 font-bold text-slate-800">
              {patient.Capitation ?? 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-500" />
            <h3 className="font-bold text-sm text-slate-800">
              Risk & Admission Prediction
            </h3>
          </div>
          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Admission Probability:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {patient.Admission_prob_percentage ?? 'N/A'}
                {patient.Admission_prob_percentage != null && '%'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Risk Score:</span>
              <span className="font-bold text-slate-800">{patient.Risk_Score ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Model Status:</span>
              <span className="font-semibold text-slate-800">{patient.Model_Admission_Status || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Actual Status:</span>
              <span className="font-semibold text-slate-800">{patient.Actual_Admission_Status || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
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
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Prediction Correct:</span>
              <span className="font-semibold text-slate-800">{patient.Prediction_Correct ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Target:</span>
              <span className="font-semibold text-slate-800">{patient.Target ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Target Predicted:</span>
              <span className="font-semibold text-slate-800">{patient.target_predicted ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Stethoscope size={18} className="text-blue-500" />
            <h3 className="font-bold text-sm text-slate-800">Clinical Utilization</h3>
          </div>
          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Office Visits:</span>
              <span className="font-bold text-slate-800">{patient.Office_Visits ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Outpatient Visits:</span>
              <span className="font-bold text-slate-800">{patient.Outpatient_Visits ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">ER Visits:</span>
              <span className="font-bold text-red-600">{patient.ER_Visits ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Dental Visits:</span>
              <span className="font-bold text-slate-800">{patient.Dental_Visits ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unique Diagnoses:</span>
              <span className="font-bold text-slate-800">{patient.Unique_Diagnosis ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unique Procedures:</span>
              <span className="font-bold text-slate-800">{patient.Unique_Procedures ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unique Claims:</span>
              <span className="font-bold text-slate-800">{patient.Unique_Claims ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unique Providers:</span>
              <span className="font-bold text-slate-800">{patient.Unique_Providers ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-800">Costs & Claims</h3>
          </div>
          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Medical Cost:</span>
              <span className="font-extrabold text-slate-900">{fmtMoney(patient.Total_Medical_Cost)}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Average Claim Cost:</span>
              <span className="font-bold text-slate-800">{fmtMoney(patient.Avg_Claim_Cost)}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Max Claim Cost:</span>
              <span className="font-bold text-slate-800">{fmtMoney(patient.Max_Claim_Cost)}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Pharmacy Cost:</span>
              <span className="font-bold text-slate-800">{fmtMoney(patient.Pharmacy_Cost)}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Dental Cost:</span>
              <span className="font-bold text-slate-800">{fmtMoney(patient.Dental_Cost)}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Medical Claims:</span>
              <span className="font-bold text-slate-800">{patient.Total_Medical_Claims ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">IPA Claims Budget:</span>
              <span className="font-bold text-slate-800">{fmtMoney(patient.IPA_Claims_Budget)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Pill size={18} className="text-purple-600" />
            <h3 className="font-bold text-sm text-slate-800">Administrative & Pharmacy</h3>
          </div>
          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">PCP Number:</span>
              <span className="font-bold text-slate-800">{patient.PCP_Number || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Group Number:</span>
              <span className="font-bold text-slate-800">{patient.Group_Number || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Capitation:</span>
              <span className="font-bold text-slate-800">{patient.Capitation ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Prescription Count:</span>
              <span className="font-bold text-slate-800">{patient.Prescription_Count ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unique Drugs:</span>
              <span className="font-bold text-slate-800">{patient.Unique_Drugs ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Drug Classes:</span>
              <span className="font-bold text-slate-800">{patient.Drug_Classes ?? 'N/A'}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Average Days Supply:</span>
              <span className="font-bold text-slate-800">{patient.Avg_Days_Supply ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

{/* Diagnoses History Component */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-800">Diagnoses History</h3>
          <span className="ml-auto text-xs font-bold text-slate-500">
            {diagnoses.length} conditions
          </span>
        </div>
        
        <div className="p-4">
          {diagnoses.length > 0 ? (
            /* 2-Column Responsive Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagnoses.map((diagnosis, index) => (
                <div
                  key={`${diagnosis.DIAGNOSIS || 'diag'}-${index}`}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-shadow shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Diagnosis Header: Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-900 leading-snug">
                        {diagnosis.SHORT_DESCRIPTION ||
                          diagnosis.LONG_DESCRIPTION ||
                          diagnosis.DIAGNOSIS ||
                          'Diagnosis'}
                      </h4>
                      {diagnosis.DIAGNOSIS_TYPE && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider shrink-0">
                          {diagnosis.DIAGNOSIS_TYPE}
                        </span>
                      )}
                    </div>

                    {/* Codes */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div>
                        Diagnosis: <span className="font-bold text-slate-800">{diagnosis.DIAGNOSIS || 'N/A'}</span>
                      </div>
                      <div>
                        Normalized: <span className="font-bold text-slate-800">{diagnosis.Normalized_DIAGNOSIS || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {diagnosis.LONG_DESCRIPTION && (
                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                        {diagnosis.LONG_DESCRIPTION}
                      </p>
                    )}
                  </div>

                  {/* Visit Stats Footer */}
                  <div className="pt-3 border-t border-slate-100/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Total Visits:</span>
                      <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px]">
                        {diagnosis.Total_Visits ?? 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Last Visit:</span>
                      <span className="font-bold text-slate-800">
                        {diagnosis.Last_Visit || diagnosis.Year_month || 'N/A'}
                      </span>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-500">
                      <span className="font-medium">Visit History:</span>
                      <p className="font-mono font-bold text-slate-700 mt-0.5 break-words">
                        {diagnosis.Visit_History || diagnosis.Year_month || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">
                No diagnosis records found.
              </p>
            </div>
          )}
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
