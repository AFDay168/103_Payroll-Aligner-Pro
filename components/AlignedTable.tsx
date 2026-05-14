
import React, { useState } from 'react';
import { AlignedRecord } from '../types';
import { Search, Filter } from 'lucide-react';

interface AlignedTableProps {
  data: AlignedRecord[];
}

const AlignedTable: React.FC<AlignedTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<AlignedRecord['status'] | 'all'>('all');

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.date.includes(searchTerm);
    const matchesFilter = filter === 'all' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyles = (status: AlignedRecord['status']) => {
    switch (status) {
      case 'match': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'mismatch': return 'bg-red-100 text-red-700 border-red-200';
      case 'missing_punch': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'missing_roster': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: AlignedRecord['status']) => {
    switch (status) {
      case 'match': return 'Match';
      case 'mismatch': return 'Time Mismatch';
      case 'missing_punch': return 'Missing Punch';
      case 'missing_roster': return 'Missing Roster';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select 
            className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="match">Match Only</option>
            <option value="mismatch">Mismatches</option>
            <option value="missing_punch">Missing Punch</option>
            <option value="missing_roster">Missing Roster</option>
          </select>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left border-b border-slate-100">Date</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Name</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">RAW In</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">RAW Out</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Time In</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Time Out</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Lunch</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Change</th>
              <th className="px-4 py-3 text-left border-b border-slate-100">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{row.date}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.name}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.rawIn}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.rawOut}</td>
                <td className={`px-4 py-3 font-medium whitespace-nowrap ${row.status === 'mismatch' ? 'text-red-600' : ''}`}>{row.timeIn}</td>
                <td className={`px-4 py-3 font-medium whitespace-nowrap ${row.status === 'mismatch' ? 'text-red-600' : ''}`}>{row.timeOut}</td>
                <td className={`px-4 py-3 font-bold whitespace-nowrap ${row.lunch !== '-' ? 'text-indigo-600' : 'text-slate-400'}`}>{row.lunch}</td>
                <td className="px-4 py-3 italic text-slate-500">{row.change}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(row.status)}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-4 py-20 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} strokeWidth={1.5} />
                    <p>No matching records found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>Showing {filteredData.length} of {data.length} records</span>
        <div className="flex gap-4">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Match</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Mismatch</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Missing</div>
        </div>
      </div>
    </div>
  );
};

export default AlignedTable;
