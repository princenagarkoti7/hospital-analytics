'use client';
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  Users, Activity, AlertTriangle, Percent, RefreshCw, CheckCircle2, ChevronRight 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdmissionPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdmissionStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/admission/stats');
      if (!response.ok) throw new Error('Backend server connect nahi ho paya');
      
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message);

      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissionStats();
  }, []);

  // Exact 7-Step Healthcare Pipeline Array
  const pipelineSteps = [
    {
      step: 1,
      title: "Data Sources",
      description: "Capitation, Dental Claims, Medical Claims, Pharmacy Claims"
    },
    {
      step: 2,
      title: "Feature Engineering",
      description: "Prior-year signals only — no leakage from prediction window"
    },
    {
      step: 3,
      title: "Data Model",
      description: "Standardized schema mapping cleaning & normalization"
    },
    {
      step: 4,
      title: "Data Mart",
      description: "Domain-specific aggregated tables & feature stores"
    },
    {
      step: 5,
      title: "Predictive Analytics",
      description: "Gradient-boosted classifiers & isotonic probability calibration"
    },
    {
      step: 6,
      title: "Publish",
      description: "Evidence-annotated worklist routed by probability score"
    },
    {
      step: 7,
      title: "Human Review",
      description: "Coder / clinician confirms — model never auto-submits"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-blue-600 font-semibold text-lg">
          <RefreshCw className="animate-spin" size={24} />
          <p>Processing Data & Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md w-full text-center space-y-3">
          <AlertTriangle className="mx-auto text-red-500" size={40} />
          <h2 className="font-bold text-xl">Data Load Failed</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchAdmissionStats}
            className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Chart 1: Risk Category Doughnut
  const riskChartData = {
    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [
      {
        data: [
          metrics?.risk_categories?.['High Risk'] || 0,
          metrics?.risk_categories?.['Medium Risk'] || 0,
          metrics?.risk_categories?.['Low Risk'] || 0,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Chart 2: Actual vs Model Predicted Admissions Bar Chart
  const admissionComparisonData = {
    labels: ['Admission', 'No Admission'],
    datasets: [
      {
        label: 'Actual Status',
        data: [
          metrics?.admission_comparison?.actual_admissions || 0,
          metrics?.admission_comparison?.actual_no_admissions || 0,
        ],
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Model Predicted',
        data: [
          metrics?.admission_comparison?.predicted_admissions || 0,
          metrics?.admission_comparison?.predicted_no_admissions || 0,
        ],
        backgroundColor: '#8b5cf6',
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              🩺 Hospital Admission Analytics & ML Diagnostics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live prediction statistics & model evaluation
            </p>
          </div>
          <button
            onClick={fetchAdmissionStats}
            className="mt-4 md:mt-0 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-300 flex items-center gap-2 transition"
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>

        {/* 7-Step Workflow Pipeline Component */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="min-w-[1000px] grid grid-cols-7 gap-3 items-start">
            {pipelineSteps.map((item, index) => (
              <div key={item.step} className="relative flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  {index < pipelineSteps.length - 1 && (
                    <div className="flex-1 flex items-center justify-end pr-1 text-slate-300">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Patients</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics?.number_of_patients || 0}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Unique Member Records</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={26} /></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Predictions</p>
              <h3 className="text-3xl font-extrabold text-purple-700 mt-1">{metrics?.total_predictions || 0}</h3>
              <p className="text-xs text-purple-600 font-medium mt-1">Processed by Model</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Activity size={26} /></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Model Accuracy</p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics?.accuracy_percentage || 0}%</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Correct Predictions</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={26} /></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Prediction Error %</p>
              <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{metrics?.error_percentage || 0}%</h3>
              <p className="text-xs text-rose-600 font-medium mt-1">Misclassification Rate</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Percent size={26} /></div>
          </div>
        </div>

        {/* Detailed Confusion Matrix Breakdown Cards */}
        {metrics?.prediction_results && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 mb-4">Model Prediction Classification Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(metrics.prediction_results).map(([key, val]) => (
                <div key={key} className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">{key}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doughnut Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Risk Category Distribution</h2>
              <p className="text-xs text-slate-500 mb-4">Breakdown of patient risk scores</p>
            </div>
            <div className="w-full max-w-[220px] mx-auto py-2">
              <Doughnut data={riskChartData} />
            </div>
          </div>

          {/* Bar Chart: Actual vs Predicted */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h2 className="text-base font-bold text-slate-800">Actual vs Model Predicted Admissions</h2>
            <p className="text-xs text-slate-500 mb-4">Comparison between real status and ML model predictions</p>
            <div className="h-[280px]">
              <Bar 
                data={admissionComparisonData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } } 
                }} 
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}