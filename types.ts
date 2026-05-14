
export interface Staff {
  id: string;
  name: string;
  department?: string;
  hourlyRate?: number;
}

export interface RosterRecord {
  date: string;
  name: string;
  rawIn: string;
  rawOut: string;
  change: string;
}

export interface PunchRecord {
  date: string;
  name: string;
  timeIn: string;
  timeOut: string;
}

export interface AlignedRecord {
  date: string;
  name: string;
  rawIn: string;
  rawOut: string;
  timeIn: string;
  timeOut: string;
  lunch: string;
  change: string;
  status: 'match' | 'mismatch' | 'missing_punch' | 'missing_roster';
}

export type FileType = 'staff' | 'roster' | 'punch';
