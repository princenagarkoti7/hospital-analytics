'use client';

import React from 'react';
import { X, Calendar, UserCheck } from 'lucide-react';

export default function MemberDetailsDrawer({ member, onClose }) {
  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Background Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {member.MEMBER_NUMBER}
              </h2>
              <p className="text-sm font-bold text-slate-700 mt-0.5">
                {member.MEMBER_NAME}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Total Diagnoses: {member.DIAGNOSES_LIST?.length || 1}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Content Body (Scrollable Diagnoses List) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {member.DIAGNOSES_LIST && member.DIAGNOSES_LIST.map((diag, index) => (
              <div 
                key={index} 
                className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 shadow-xs"
              >
                {/* Diagnosis Badge & Type */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                    {diag.DIAGNOSIS_Code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide bg-slate-200/60 px-2 py-0.5 rounded-md">
                    {diag.DIAGNOSIS_TYPE}
                  </span>
                </div>

                {/* Long Description */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Long Description
                  </span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-relaxed">
                    {diag.LONG_DESCRIPTION}
                  </p>
                </div>

                {/* Claim & Paid Date */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Claim Number</span>
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{diag.CLAIM_NUMBER}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid Date</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {diag.PAID_DATE}
                    </p>
                  </div>
                </div>

                {/* Service Dates */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Service Date</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{diag.SERVICE_DATE}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Service End Date</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{diag.SERVICE_END_DATE}</p>
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid Amount</span>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">{diag.PAID_AMOUNT}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Prepaid Amount</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">{diag.PREPAID_AMOUNT}</p>
                  </div>
                </div>

                {/* PCP Info (Standard Grid Style) */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">PCP Name</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                      <UserCheck size={12} className="text-slate-400" />
                      {diag.PCP_FIRST_NAME} {diag.PCP_LAST_NAME}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">PCP Number</span>
                    <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{diag.PCP_NUMBER}</p>
                  </div>
                </div>

                {/* Target HCC V24 & V28 (Standard Grid Style) */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Target HCC V24</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{diag.TARGET_HCC_V24}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Target HCC V28</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{diag.TARGET_HCC_V28}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}