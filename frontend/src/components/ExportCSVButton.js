'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function ExportCSVButton({
  endpoint,
  queryParams = {},
  fileNamePrefix = "Report",
  totalRecords = 1,
  buttonText = "Export CSV",
  className = ""
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (totalRecords === 0 || exporting || !endpoint) return;

    try {
      setExporting(true);

      const cleanParams = Object.entries(queryParams).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          acc[key] = String(value).trim();
        }
        return acc;
      }, {});

      const params = new URLSearchParams(cleanParams);
      const fullUrl = `${API_BASE_URL}${endpoint}?${params.toString()}`;

      const response = await fetch(fullUrl, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Date aur Time Format (e.g., 2026-09-07_14-30-45)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      
      const fileName = `${fileNamePrefix}_${dateStr}_${timeStr}.csv`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('Unable to export CSV at this moment.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || totalRecords === 0}
      className={`inline-flex items-center justify-center h-9 gap-2 px-3.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 shadow-xs whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition ${className}`}
    >
      {exporting ? (
        <Loader2 size={14} className="animate-spin text-white" />
      ) : (
        <Download size={14} className="text-white" />
      )}
      <span>{exporting ? 'Exporting...' : buttonText}</span>
    </button>
  );
}