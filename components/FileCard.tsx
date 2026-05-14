
import React, { useRef } from 'react';
import { Upload, CheckCircle2, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  onDataLoad: (data: any[]) => void;
  isLoaded: boolean;
  count: number;
}

const FileCard: React.FC<FileCardProps> = ({ title, icon, description, onDataLoad, isLoaded, count }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { 
          type: 'binary', 
          cellDates: true, 
          cellNF: false, 
          cellText: false 
        });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Use defval to avoid missing keys in rows
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        onDataLoad(data);
      } catch (err) {
        console.error("XLSX Read Error:", err);
        alert("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so the same file can be uploaded again
    e.target.value = '';
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative overflow-hidden group cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 h-full
        ${isLoaded 
          ? 'bg-indigo-50 border-indigo-200 shadow-inner' 
          : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1'}
      `}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".csv, .xlsx, .xls"
      />
      
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${isLoaded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'} transition-colors`}>
          {icon}
        </div>
        {isLoaded && (
          <div className="animate-in zoom-in duration-300">
            <CheckCircle2 className="text-indigo-600" size={24} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {isLoaded ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
            <FileText size={14} /> {count} records loaded
          </div>
        ) : (
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold group-hover:underline">
            <Upload size={16} /> Choose file...
          </div>
        )}
      </div>
      
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-indigo-600/5 rounded-full blur-2xl transition-all group-hover:w-24 group-hover:h-24"></div>
    </div>
  );
};

export default FileCard;
