'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Database, Activity, FileText } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname() || '';
  const currentPath = pathname.toLowerCase();

  return (
    <header className="sticky top-0 z-50 bg-slate-100/90 backdrop-blur-md border-b border-slate-200 text-slate-800">
      <div className="w-full px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* Brand Section */}
        <Link href="/Admission" className="flex items-center gap-3 group">
          <div className="relative w-20 h-20 flex items-center justify-center group-hover:scale-105 transition shrink-0">
            <Image 
              src="/logo.webp"
              alt="Health Analytics Logo"
              width={80}
              height={90}
              className="object-contain"
              priority
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>

          <span className="font-extrabold text-2xl tracking-tight text-slate-700">
            HealthAnalytics
          </span>
        </Link>

        {/* Top Nav Links */}
        <nav className="flex items-center gap-6">
          {/* Admission Link */}
          <Link 
            href="/Admission" 
            className={`group/link relative flex items-center gap-2 px-3 py-2 text-base font-semibold transition-colors ${
              currentPath.startsWith('/admission') 
                ? 'text-sky-600' 
                : 'text-slate-600 hover:text-sky-600'
            }`}
          >
            <Database 
              size={18} 
              className={`transition-colors ${
                currentPath.startsWith('/admission') 
                  ? 'text-sky-600' 
                  : 'text-slate-400 group-hover/link:text-sky-600'
              }`} 
            />
            <span>Admission Diagnostics</span>
            
            {currentPath.startsWith('/admission') && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
            )}
          </Link>

          {/* Readmission Link */}
          <Link 
            href="/Readmission" 
            className={`group/link relative flex items-center gap-2 px-3 py-2 text-base font-semibold transition-colors ${
              currentPath.startsWith('/readmission') 
                ? 'text-sky-600' 
                : 'text-slate-600 hover:text-sky-600'
            }`}
          >
            <Activity 
              size={18} 
              className={`transition-colors ${
                currentPath.startsWith('/readmission') 
                  ? 'text-sky-600' 
                  : 'text-slate-400 group-hover/link:text-sky-600'
              }`} 
            />
            <span>Readmission Diagnostics</span>
            
            {currentPath.startsWith('/readmission') && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
            )}
          </Link>

          {/* ICD Codes Link */}
          <Link 
            href="/ICDcodes" 
            className={`group/link relative flex items-center gap-2 px-3 py-2 text-base font-semibold transition-colors ${
              currentPath.startsWith('/ICDcodes') 
                ? 'text-sky-600' 
                : 'text-slate-600 hover:text-sky-600'
            }`}
          >
            <FileText 
              size={18} 
              className={`transition-colors ${
                currentPath.startsWith('/ICDcodes') 
                  ? 'text-sky-600' 
                  : 'text-slate-400 group-hover/link:text-sky-600'
              }`} 
            />
            <span>ICD Codes</span>
            
            {currentPath.startsWith('/ICDcodes') && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
            )}
          </Link>
        </nav>

      </div>
    </header>
  );
}