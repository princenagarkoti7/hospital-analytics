'use client';
import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro'; // Modern drop-in replacement
import jsPDF from 'jspdf';

export default function ExportPdfButton({ targetRef, fileName = 'Hospital_Admission_Analytics.pdf', className = '' }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    if (!targetRef || !targetRef.current) {
      alert('PDF ke liye content area nahi mila!');
      return;
    }

    setIsExporting(true);

    try {
      const element = targetRef.current;
      
      // Animations ya render complete hone ke liye chhota timeout
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution quality
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page add karein
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Agar content A4 height se zyada ho toh multi-page generate karein
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('PDF generate karte waqt error aaya, kripya dobara try karein.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={isExporting}
      className={`bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {isExporting ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download size={14} />
          <span>Export PDF</span>
        </>
      )}
    </button>
  );
}