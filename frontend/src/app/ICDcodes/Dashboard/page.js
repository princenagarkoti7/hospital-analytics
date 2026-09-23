'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  FileCode2,
  AlertOctagon,
  Percent,
  Users,
  RotateCcw,
  Stethoscope,
  Filter,
  Layers
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

export default function HccDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filtersData, setFiltersData] = useState({
    pcps: [],
    conditions: [],
    hcc_codes: []
  });

  // Selected filters
  const [selectedPcp, setSelectedPcp] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [selectedHcc, setSelectedHcc] = useState('ALL');

  // 1. Fetch Dropdown Options once on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch(`${API_URL}/api/icd/dashboard-filters`);
        const json = await res.json();
        if (json.success) {
          setFiltersData({
            pcps: json.pcps || [],
            conditions: json.conditions || [],
            hcc_codes: json.hcc_codes || []
          });
        }
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    loadFilters();
  }, []);

  // 2. Fetch Aggregated KPIs whenever filters change
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        pcp: selectedPcp,
        condition: selectedCondition,
        hcc: selectedHcc
      });

      const res = await fetch(`${API_URL}/api/icd/dashboard-stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStats(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPcp, selectedCondition, selectedHcc]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleReset = () => {
    setSelectedPcp('ALL');
    setSelectedCondition('ALL');
    setSelectedHcc('ALL');
  };

  const kpis = stats?.kpis || {
    total_icd_codes: 0,
    unique_icd_codes: 0,
    total_unique_members: 0,
    unsupported_v28_codes: 0,
    unsupported_percentage: 0
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            HCC Version & Transition Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics for CMS-HCC V24 to V28 mapping transitions and code risk support
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs self-start"
        >
          <RotateCcw size={14} />
          Reset Filters
        </button>
      </div>

      {/* ================= FILTERS PANEL ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <Filter size={15} className="text-sky-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Interactive Filter Controls
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter 1: PCP Provider */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              PCP – Provider
            </label>
            <select
              value={selectedPcp}
              onChange={(e) => setSelectedPcp(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
            >
              <option value="ALL">All PCPs / Providers</option>
              {filtersData.pcps.map((p, idx) => (
                <option key={`pcp-${p.id}-${idx}`} value={p.id}>
                  {p.name} (ID: {p.id})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Conditions (ICD Code) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Conditions (ICD Code)
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
            >
              <option value="ALL">All ICD-10 Conditions</option>
              {filtersData.conditions.map((c, idx) => (
                <option key={`diag-${c.diagnosis}-${idx}`} value={c.diagnosis}>
                  {c.diagnosis} - {c.description.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: HCC # & Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              HCC # & Description (V24)
            </label>
            <select
              value={selectedHcc}
              onChange={(e) => setSelectedHcc(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
            >
              <option value="ALL">All V24 HCC Categories</option>
              {filtersData.hcc_codes.map((h, idx) => (
                <option key={`hcc-${h.code}-${idx}`} value={h.code}>
                  HCC {h.code} - {h.description.slice(0, 40)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================= CORE KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total ICD 10 Codes */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <FileCode2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total ICD-10 Codes
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {loading ? '...' : kpis.total_icd_codes.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {kpis.unique_icd_codes.toLocaleString()} unique diagnosis codes
            </p>
          </div>
        </div>

        {/* KPI 2: Unsupported in V28 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertOctagon size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Unsupported in V28
            </p>
            <h3 className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
              {loading ? '...' : kpis.unsupported_v28_codes.toLocaleString()}
            </h3>
            <p className="text-[11px] text-rose-700 font-medium">
              Coded in V24, dropped in V28
            </p>
          </div>
        </div>

        {/* KPI 3: %age Not Supported in V28 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Percent size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              % Unsupported in V28
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {loading ? '...' : `${kpis.unsupported_percentage}%`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Of submitted diagnosis volume
            </p>
          </div>
        </div>

        {/* KPI 4: Total Impacted Members */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Members Impacted
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {loading ? '...' : kpis.total_unique_members.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Across selected criteria
            </p>
          </div>
        </div>

      </div>

      {/* ================= IMPACTED V24 HCCS BREAKDOWN ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Most Impacted V24 HCC Categories (Dropped in V28)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            Top 10 Impacted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50/80 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">V24 HCC Code</th>
                <th className="px-4 py-3">Clinical Description</th>
                <th className="px-4 py-3 text-center">Total Volume</th>
                <th className="px-4 py-3 text-center">Dropped in V28</th>
                <th className="px-4 py-3 text-right">V28 Drop Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
              {stats?.impacted_hccs && stats.impacted_hccs.length > 0 ? (
                stats.impacted_hccs.map((item, idx) => {
                  const dropRate = item.total_claims > 0
                    ? Math.round((item.unsupported_v28 / item.total_claims) * 100)
                    : 0;

                  return (
                    <tr key={`impact-${item.hcc_code}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-sky-700 whitespace-nowrap">
                        HCC {item.hcc_code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {item.total_claims.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600">
                        {item.unsupported_v28.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          dropRate > 50
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {dropRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {loading ? 'Calculating impacted HCC categories...' : 'No impacted V24 categories found for current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}