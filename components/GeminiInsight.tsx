
import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AlignedRecord, Staff } from '../types';

interface GeminiInsightProps {
  alignedData: AlignedRecord[];
  staffData: Staff[];
}

const GeminiInsight: React.FC<GeminiInsightProps> = ({ alignedData, staffData }) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare a summarized version of the data for context
      const mismatches = alignedData.filter(d => d.status === 'mismatch').length;
      const missing = alignedData.filter(d => d.status === 'missing_punch').length;
      
      const summary = alignedData.slice(0, 10).map(d => 
        `${d.date} - ${d.name}: Roster(${d.rawIn}-${d.rawOut}) vs Punch(${d.timeIn}-${d.timeOut}) -> ${d.status}`
      ).join('\n');

      const prompt = `
        Analyze this payroll reconciliation summary:
        Total Records: ${alignedData.length}
        Mismatches: ${mismatches}
        Missing Punches: ${missing}
        
        Staff Data Count: ${staffData.length}
        
        Sample data:
        ${summary}
        
        Provide a concise analysis of potential payroll issues, identifying any patterns or specific areas of concern that a HR manager should investigate first. Be professional and data-driven.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setInsight(response.text || "I couldn't generate an insight at this moment.");
    } catch (error) {
      console.error("Gemini Error:", error);
      setInsight("Error connecting to Gemini AI. Please check your API configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-xl text-white">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-yellow-300" />
        <h3 className="text-lg font-bold">AI Data Insight</h3>
      </div>
      
      {insight ? (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="bg-white/10 p-4 rounded-xl text-sm leading-relaxed border border-white/20 whitespace-pre-wrap">
            {insight}
          </div>
          <button 
            onClick={() => setInsight(null)}
            className="text-xs font-semibold text-indigo-100 hover:text-white transition-colors underline decoration-indigo-300/50"
          >
            Clear and regenerate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-indigo-100 text-sm">
            Let Gemini analyze your reconciled data to find suspicious patterns, frequent latecomers, or missing shift records.
          </p>
          <button
            onClick={generateInsight}
            disabled={loading}
            className={`
              w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all
              ${loading 
                ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg hover:scale-[1.02] active:scale-95'}
            `}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} /> Generate Analysis
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GeminiInsight;
