import axios from '../utils/axios';

export interface LogItem {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  module: string;
  endpoint?: string;
  user_id?: string;
  role?: string;
  action: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  request_id?: string;
  duration_ms?: number;
}

export interface LogQuery {
  level?: string;
  module?: string;
  user_id?: string;
  role?: string;
  start?: string; // ISO
  end?: string;   // ISO
  page?: number;
  page_size?: number;
}

export async function fetchLogs(params: LogQuery) {
  const { data } = await axios.get('/logs', { params });
  return data as { items: LogItem[]; total: number; page: number; page_size: number };
}

export async function fetchLogStats() {
  const { data } = await axios.get('/logs/stats');
  return data as { stats: Array<{ _id: { level: string; module: string }; count: number }> };
}

export function exportCsv(items: LogItem[]): string {
  const headers = ['timestamp','level','module','endpoint','user_id','role','action','ip_address','request_id','duration_ms'];
  const rows = items.map(i => [
    i.timestamp,
    i.level,
    i.module,
    i.endpoint ?? '',
    i.user_id ?? '',
    i.role ?? '',
    i.action,
    i.ip_address ?? '',
    i.request_id ?? '',
    i.duration_ms ?? ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replace(/,/g,';')).join(','))].join('\n');
  return csv;
}
