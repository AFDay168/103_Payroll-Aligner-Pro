
import React, { useState, useCallback } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  Download, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Staff, RosterRecord, PunchRecord, AlignedRecord, FileType } from './types';
import FileCard from './components/FileCard';
import AlignedTable from './components/AlignedTable';
import GeminiInsight from './components/GeminiInsight';

const App: React.FC = () => {
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [rosterData, setRosterData] = useState<RosterRecord[]>([]);
  const [punchData, setPunchData] = useState<PunchRecord[]>([]);
  const [alignedData, setAlignedData] = useState<AlignedRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to find a value in an object by searching keys for keywords
  const findValue = (row: any, keywords: string[]): any => {
    const keys = Object.keys(row);
    const foundKey = keys.find(k => {
      const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return keywords.some(kw => lowerK.includes(kw.toLowerCase()));
    });
    return foundKey ? row[foundKey] : undefined;
  };

  /**
   * Normalizes time values from Excel (Date objects, fractional numbers, or strings)
   * into a standard HH:mm string.
   */
  const normalizeTime = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    
    // If it's an Excel fractional number (e.g. 0.5 for 12:00 PM)
    if (typeof val === 'number' && val < 1) {
      const totalSeconds = Math.round(val * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // If it's a Date object
    if (val instanceof Date) {
      return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
    }

    // If it's a string, attempt to clean it up
    const s = String(val).trim();
    if (!s) return '';
    
    // Check for HH:mm pattern
    const match = s.match(/(\d{1,2}):(\d{1,2})/);
    if (match) {
      // Handle AM/PM if present
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const isPM = s.toLowerCase().includes('pm');
      const isAM = s.toLowerCase().includes('am');
      
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return s;
  };

  /**
   * Normalizes date values from Excel, Date objects, or strings.
   * Extracts local date parts to prevent timezone shifts.
   */
  const normalizeDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    
    let d: Date;
    if (typeof val === 'number' && val >= 1) {
      d = new Date(Math.round((val - 25569) * 86400 * 1000));
    } else if (val instanceof Date) {
      d = val;
    } else {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) return String(val).trim();
      d = new Date(parsed);
    }

    try {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (year < 1900 || year > 2100) return String(val).trim();
      return `${year}-${month}-${day}`;
    } catch {
      return String(val).trim();
    }
  };

  const canonicalName = (name: any): string => {
    return String(name || '').trim().toLowerCase();
  };

  const calculateLunch = (dateStr: string, timeIn: string, timeOut: string): string => {
    if (!timeIn || !timeOut || timeIn === '-' || timeOut === '-') return '-';
    
    // 1. Check if weekend
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) return '-';

    // 2. Parse minutes robustly
    const parseToMinutes = (t: string) => {
      // normalizeTime already formats to HH:mm, but we'll be defensive
      const parts = t.split(':');
      if (parts.length < 2) return -1;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return -1;
      return hours * 60 + minutes;
    };

    const inMin = parseToMinutes(timeIn);
    const outMin = parseToMinutes(timeOut);

    if (inMin === -1 || outMin === -1) return '-';

    // Criteria: 
    // Time In earlier than 12:01 (<= 12:00)
    // Time Out later than 13:59 (>= 14:00)
    const thresholdIn = 12 * 60; // 12:00
    const thresholdOut = 14 * 60; // 14:00

    if (inMin <= thresholdIn && outMin >= thresholdOut) {
      return '01:00';
    }
    
    return '-';
  };

  const handleFileUpload = (type: FileType, data: any[]) => {
    if (type === 'staff') {
      const normalized = data.map(row => ({
        id: String(findValue(row, ['id', 'staffid', 'no', 'code']) || ''),
        name: String(findValue(row, ['name', 'staffname', 'employee', 'full_name']) || ''),
        department: String(findValue(row, ['dept', 'department', 'division']) || ''),
        hourlyRate: parseFloat(findValue(row, ['rate', 'wage', 'hourly', 'pay']) || 0)
      }));
      setStaffData(normalized);
    } else if (type === 'roster') {
      const normalized = data.map(row => ({
        date: normalizeDate(findValue(row, ['date', 'day', 'work_date'])),
        name: String(findValue(row, ['name', 'staff', 'employee', 'user']) || ''),
        rawIn: normalizeTime(findValue(row, ['rawin', 'start', 'shiftin', 'in_time', 'time_in'])),
        rawOut: normalizeTime(findValue(row, ['rawout', 'end', 'shiftout', 'out_time', 'time_out'])),
        change: String(findValue(row, ['change', 'remark', 'note', 'reason']) || '')
      }));
      setRosterData(normalized.filter(r => r.date && r.name));
    } else if (type === 'punch') {
      const normalized = data.map(row => ({
        date: normalizeDate(findValue(row, ['date', 'day', 'punch_date', 'work_date'])),
        name: String(findValue(row, ['name', 'staff', 'employee', 'user']) || ''),
        timeIn: normalizeTime(findValue(row, ['timein', 'punchin', 'clockin', 'in', 'actual_in'])),
        timeOut: normalizeTime(findValue(row, ['timeout', 'punchout', 'clockout', 'out', 'actual_out']))
      }));
      setPunchData(normalized.filter(p => p.date && p.name));
    }
  };

  const alignRecords = useCallback(() => {
    setIsProcessing(true);
    
    const result: AlignedRecord[] = [];
    const usedPunchIndices = new Set<number>();

    // 1. Map Roster records to Punch records
    rosterData.forEach((roster) => {
      const lowerName = canonicalName(roster.name);
      
      const punchIndex = punchData.findIndex((p, idx) => 
        !usedPunchIndices.has(idx) && 
        p.date === roster.date && 
        canonicalName(p.name) === lowerName
      );

      let punch = undefined;
      if (punchIndex !== -1) {
        punch = punchData[punchIndex];
        usedPunchIndices.add(punchIndex);
      }

      let status: AlignedRecord['status'] = 'match';
      if (!punch) {
        status = 'missing_punch';
      } else {
        const cleanRosterIn = roster.rawIn.trim();
        const cleanRosterOut = roster.rawOut.trim();
        const cleanPunchIn = punch.timeIn.trim();
        const cleanPunchOut = punch.timeOut.trim();

        const inDiff = cleanRosterIn && cleanPunchIn && cleanRosterIn !== cleanPunchIn;
        const outDiff = cleanRosterOut && cleanPunchOut && cleanRosterOut !== cleanPunchOut;
        if (inDiff || outDiff) status = 'mismatch';
      }

      const pIn = punch?.timeIn || '-';
      const pOut = punch?.timeOut || '-';

      result.push({
        date: roster.date,
        name: roster.name,
        rawIn: roster.rawIn || '-',
        rawOut: roster.rawOut || '-',
        timeIn: pIn,
        timeOut: pOut,
        lunch: calculateLunch(roster.date, pIn, pOut),
        change: roster.change || '-',
        status
      });
    });

    // 2. Add remaining Punch records as "Missing Roster"
    punchData.forEach((punch, idx) => {
      if (!usedPunchIndices.has(idx)) {
        result.push({
          date: punch.date,
          name: punch.name,
          rawIn: '-',
          rawOut: '-',
          timeIn: punch.timeIn,
          timeOut: punch.timeOut,
          lunch: calculateLunch(punch.date, punch.timeIn, punch.timeOut),
          change: '-',
          status: 'missing_roster'
        });
      }
    });

    result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    setAlignedData(result);
    setIsProcessing(false);
  }, [rosterData, punchData]);

  const exportToExcel = () => {
    // Clean up data for export: replace '-' placeholders with empty strings for requested columns
    const cleanDataForExport = alignedData.map(d => ({
      'Date': d.date,
      'Name': d.name,
      'RAW In': d.rawIn === '-' ? '' : d.rawIn,
      'RAW Out': d.rawOut === '-' ? '' : d.rawOut,
      'Time In': d.timeIn === '-' ? '' : d.timeIn,
      'Time Out': d.timeOut === '-' ? '' : d.timeOut,
      'Change': d.change === '-' ? '' : d.change,
      'Lunch': d.lunch === '-' ? '' : d.lunch,
      'Status': d.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleanDataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AlignedRecords");
    XLSX.writeFile(workbook, `Payroll_Alignment_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const reset = () => {
    setStaffData([]);
    setRosterData([]);
    setPunchData([]);
    setAlignedData([]);
  };

  const isReady = rosterData.length > 0 && punchData.length > 0;

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSpreadsheet className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Payroll Aligner <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-3">
            {alignedData.length > 0 && (
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
              >
                <Download size={18} /> Export Excel
              </button>
            )}
            <button onClick={reset} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCcw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Wage Reconciliation</h2>
          <p className="text-slate-500 max-w-2xl">
            Upload files to align rosters with punch records. Includes precise 1-hour lunch detection for weekday shifts (Clock-in ≤ 12:00 and Clock-out ≥ 14:00).
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileCard 
            title="Staff List" 
            icon={<Users className="w-6 h-6" />}
            onDataLoad={(data) => handleFileUpload('staff', data)}
            isLoaded={staffData.length > 0}
            count={staffData.length}
            description="Employee master data"
          />
          <FileCard 
            title="Roster" 
            icon={<Calendar className="w-6 h-6" />}
            onDataLoad={(data) => handleFileUpload('roster', data)}
            isLoaded={rosterData.length > 0}
            count={rosterData.length}
            description="All scheduled shift entries"
          />
          <FileCard 
            title="Punch Cards" 
            icon={<Clock className="w-6 h-6" />}
            onDataLoad={(data) => handleFileUpload('punch', data)}
            isLoaded={punchData.length > 0}
            count={punchData.length}
            description="Actual recorded clock times"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={alignRecords}
            disabled={!isReady || isProcessing}
            className={`
              flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all
              ${isReady 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            {isProcessing ? <RefreshCcw className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
            Align Records Now
          </button>
        </div>

        {alignedData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AlignedTable data={alignedData} />
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-indigo-500" />
                  Alignment Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600 text-sm font-medium">Total Entries</span>
                    <span className="font-bold">{alignedData.length}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-red-50 rounded-lg text-red-700 border border-red-100">
                    <span className="text-sm font-medium">Time Mismatches</span>
                    <span className="font-bold">{alignedData.filter(d => d.status === 'mismatch').length}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-orange-50 rounded-lg text-orange-700 border border-orange-100">
                    <span className="text-sm font-medium">Missing Punches</span>
                    <span className="font-bold">{alignedData.filter(d => d.status === 'missing_punch').length}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-50 rounded-lg text-blue-700 border border-blue-100">
                    <span className="text-sm font-medium">Missing Roster</span>
                    <span className="font-bold">{alignedData.filter(d => d.status === 'missing_roster').length}</span>
                  </div>
                </div>
              </div>
              <GeminiInsight alignedData={alignedData} staffData={staffData} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
