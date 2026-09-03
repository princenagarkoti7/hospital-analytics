'use client';

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Calendar, User } from 'lucide-react';

export default function MemberDetailsDrawer({ member, selectedMemberId, onClose }) {
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  // Extract ID whether passed as an object or a raw ID string
  const activeMemberId = selectedMemberId || (typeof member === 'object' ? member?.MEMBER_NUMBER : member);

  useEffect(() => {
    if (!activeMemberId) {
      setDrawerDetails(null);
      return;
    }

    const fetchMemberProfile = async () => {
      setDrawerLoading(true);
      setDrawerError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/icd/member/${activeMemberId}`);
        if (!res.ok) throw new Error('Failed to retrieve patient drawer data');
        const json = await res.json();
        if (!json.success) throw new Error(json.detail || 'Failed to fetch details');
        setDrawerDetails(json);
      } catch (err) {
        setDrawerError(err.message);
      } finally {
        setDrawerLoading(false);
      }
    };

    fetchMemberProfile();
  }, [activeMemberId]);

  if (!activeMemberId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMemberId}
              </h2>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {drawerDetails?.member_name || (drawerLoading ? 'Loading...' : 'Patient Details')}
              </p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Total Diagnoses: {drawerDetails?.total_diagnoses ?? 0}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
            {drawerLoading ? (
              <div className="py-24 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-medium">Fetching member diagnoses from DB...</p>
              </div>
            ) : drawerError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
                {drawerError}
              </div>
            ) : drawerDetails?.diagnoses && drawerDetails.diagnoses.length > 0 ? (
              drawerDetails.diagnoses.map((diag, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  {/* Diagnosis Code & Type */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-black tracking-tight">
                      {diag.DIAGNOSIS}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                      {diag.DIAGNOSIS_TYPE}
                    </span>
                  </div>

                  {/* Long Description */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Long Description
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">
                      {diag.LONG_DESCRIPTION}
                    </p>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Claim & Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Claim Number</p>
                      <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{diag.CLAIM_NUMBER}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Date</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        {diag.PAID_DATE}
                      </p>
                    </div>
                  </div>

                  {/* Service Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Date</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{diag.SERVICE_DATE}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service End Date</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{diag.SERVICE_END_DATE}</p>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Amount</p>
                      <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                        ${Number(diag.PAID_AMOUNT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prepaid Amount</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        ${Number(diag.PREPAID_AMOUNT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* PCP Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PCP Name</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
                        <User size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {diag.PCP_FULL_NAME || diag.PCP_NAME || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PCP Number</p>
                      <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{diag.PCP_NUMBER}</p>
                    </div>
                  </div>

                  {/* HCC Versions */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target HCC V24</p>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">{diag.TARGET_HCC_V24}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target HCC V28</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-snug">{diag.TARGET_HCC_V28}</p>
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-10">No diagnoses found for this member.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}