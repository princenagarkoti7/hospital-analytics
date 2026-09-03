'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, ChevronDown, ArrowUpRight } from 'lucide-react';
import MemberDetailsDrawer from '@/components/MemberDetailsDrawer';

// Static Sample Data
const SAMPLE_ICD_DATA = [
  {
    MEMBER_NUMBER: '123457508',
    MEMBER_NAME: 'Sarah Jenkins',
    DIAGNOSIS: 'K70.30',
    CLAIM_NUMBER: 'CLM9823411',
    PAID_DATE: '2024-02-15',
    LONG_DESCRIPTION: 'Alcoholic cirrhosis of liver without ascites',
    DIAGNOSES_LIST: [
      {
        DIAGNOSIS_Code: 'K70.30',
        LONG_DESCRIPTION: 'Alcoholic cirrhosis of liver without ascites',
        DIAGNOSIS_TYPE: 'Primary',
        CLAIM_NUMBER: 'CLM9823411',
        PAID_DATE: '2024-02-15',
        SERVICE_DATE: '2024-02-01',
        SERVICE_END_DATE: '2024-02-05',
        PAID_AMOUNT: '$1,250.00',
        PREPAID_AMOUNT: '$0.00',
        PCP_NUMBER: 'PCP8821',
        PCP_LAST_NAME: 'Smith',
        PCP_FIRST_NAME: 'John',
        TARGET_HCC_V24: '64',
        TARGET_HCC_V28: 'ICD Code removed from V28'
      }
    ]
  },
  {
    MEMBER_NUMBER: '123457634',
    MEMBER_NAME: 'Robert Chen',
    DIAGNOSIS: 'E11.9',
    CLAIM_NUMBER: 'CLM9823412',
    PAID_DATE: '2024-02-14',
    LONG_DESCRIPTION: 'Type 2 diabetes mellitus without complications',
    DIAGNOSES_LIST: [
      {
        DIAGNOSIS_Code: 'E11.9',
        LONG_DESCRIPTION: 'Type 2 diabetes mellitus without complications',
        DIAGNOSIS_TYPE: 'Primary',
        CLAIM_NUMBER: 'CLM9823412',
        PAID_DATE: '2024-02-14',
        SERVICE_DATE: '2024-01-20',
        SERVICE_END_DATE: '2024-01-20',
        PAID_AMOUNT: '$450.00',
        PREPAID_AMOUNT: '$50.00',
        PCP_NUMBER: 'PCP4410',
        PCP_LAST_NAME: 'Gupta',
        PCP_FIRST_NAME: 'Aria',
        TARGET_HCC_V24: '19',
        TARGET_HCC_V28: '38'
      }
    ]
  },
  {
    MEMBER_NUMBER: '123457953',
    MEMBER_NAME: 'Elena Rostova',
    DIAGNOSIS: 'E11.65',
    CLAIM_NUMBER: 'CLM9823413',
    PAID_DATE: '2024-02-10',
    LONG_DESCRIPTION: 'Type 2 diabetes mellitus with hyperglycemia',
    DIAGNOSES_LIST: [
      {
        DIAGNOSIS_Code: 'E11.65',
        LONG_DESCRIPTION: 'Type 2 diabetes mellitus with hyperglycemia',
        DIAGNOSIS_TYPE: 'Primary',
        CLAIM_NUMBER: 'CLM9823413',
        PAID_DATE: '2024-02-10',
        SERVICE_DATE: '2024-01-15',
        SERVICE_END_DATE: '2024-01-16',
        PAID_AMOUNT: '$890.00',
        PREPAID_AMOUNT: '$0.00',
        PCP_NUMBER: 'PCP9012',
        PCP_LAST_NAME: 'Taylor',
        PCP_FIRST_NAME: 'David',
        TARGET_HCC_V24: '18',
        TARGET_HCC_V28: '37'
      }
    ]
  }
];

export default function ICDCodesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionCategory, setConditionCategory] = useState('All conditions');
  const [selectedMember, setSelectedMember] = useState(null);

  // Filter Logic
  const filteredData = SAMPLE_ICD_DATA.filter((item) => {
    const matchesSearch =
      item.MEMBER_NUMBER.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.MEMBER_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.DIAGNOSIS.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.CLAIM_NUMBER.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.LONG_DESCRIPTION.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCondition =
      conditionCategory === 'All conditions' ||
      item.LONG_DESCRIPTION.toLowerCase().includes(conditionCategory.toLowerCase()) ||
      (conditionCategory === 'Diabetes' && item.LONG_DESCRIPTION.toLowerCase().includes('diabetes')) ||
      (conditionCategory === 'Cirrhosis' && item.LONG_DESCRIPTION.toLowerCase().includes('cirrhosis'));

    return matchesSearch && matchesCondition;
  });

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-6 lg:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Matching Image */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Member Readmission Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Filter and manage registered members based on readmission probabilities
            </p>
          </div>

          {/* Right Header Count Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-blue-50/80 border border-blue-100/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Showing {filteredData.length} of {SAMPLE_ICD_DATA.length}
          </div>
        </div>

        {/* Filter & Search Bar with All conditions dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* All conditions Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={conditionCategory}
              onChange={(e) => setConditionCategory(e.target.value)}
              className="appearance-none w-full sm:w-auto pl-4 pr-9 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs hover:bg-slate-50 transition-all"
            >
              <option value="All conditions">All conditions</option>
              <option value="Diabetes">Diabetes</option>
              <option value="Cirrhosis">Cirrhosis of liver</option>
              <option value="Heart failure">Heart failure (CHF)</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 w-full max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Member ID..."
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/90 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
          </div>

        </div>

        {/* Clean Modern Registry Table */}
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
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={row.CLAIM_NUMBER + idx} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Member ID with Blue Color and Arrow Icon on Hover */}
                      <td 
                        className="py-3.5 px-5 font-bold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
                        onClick={() => setSelectedMember(row)}
                      >
                        <span>{row.MEMBER_NUMBER}</span>
                        <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800">{row.MEMBER_NAME}</td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {row.DIAGNOSIS}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-medium text-slate-600">{row.CLAIM_NUMBER}</td>
                      <td className="py-3.5 px-5 font-medium text-slate-600">{row.PAID_DATE}</td>
                      <td className="py-3.5 px-5 text-slate-600 leading-relaxed font-medium">{row.LONG_DESCRIPTION}</td>
                    </tr>
                  ))
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

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium bg-white">
            <span>
              Showing <strong className="text-slate-800">{filteredData.length}</strong> of{' '}
              <strong className="text-slate-800">{SAMPLE_ICD_DATA.length}</strong> records
            </span>

            <div className="flex items-center gap-2">
              <button disabled className="p-1.5 rounded-lg border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-bold text-slate-700">1</span>
              <button disabled className="p-1.5 rounded-lg border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed">
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