import React, { useEffect, useMemo, useState } from 'react';
import { fetchLogs, fetchLogStats, exportCsv, LogItem } from '../services/logs.service';

const levels = ['DEBUG','INFO','WARNING','ERROR','CRITICAL'] as const;

export const LogViewer: React.FC = () => {
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [level, setLevel] = useState<string>('');
  const [module, setModule] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState<Array<{ _id: { level: string; module: string }; count: number }>>([]);

  const load = async () => {
    const data = await fetchLogs({ level: level || undefined, module: module || undefined, user_id: userId || undefined, role: role || undefined, page, page_size: pageSize });
    setItems(data.items);
    setTotal(data.total);
    const s = await fetchLogStats();
    setStats(s.stats);
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, level, module, userId, role, page, pageSize]);

  const csv = useMemo(() => exportCsv(items), [items]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="fade-in p-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">System Logs</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Level</label>
            <select value={level} onChange={e=>setLevel(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All</option>
              {levels.map(l=> <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Module</label>
            <input value={module} onChange={e=>setModule(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" placeholder="middleware, auth, farmers" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">User</label>
            <input value={userId} onChange={e=>setUserId(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" placeholder="email or id" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Role</label>
            <input value={role} onChange={e=>setRole(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" placeholder="ADMIN, OPERATOR, FARMER" />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg w-full">
              <i className="fa-solid fa-rotate mr-2"/> Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
            <button onClick={downloadCsv} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg"><i className="fa-solid fa-file-csv mr-2"/> Export CSV</button>
          </div>
          <div className="text-sm text-gray-600">Total: {total}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg">Logs</h3>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="p-2 border rounded-lg">
                {[10,20,50,100].map(n=> <option key={n} value={n}>{n}/page</option>)}
              </select>
              <div className="flex gap-1">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Prev</button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Level</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3">Endpoint</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((i, idx) => (
                <tr key={idx} className="hover:bg-green-50 transition">
                  <td className="px-6 py-4">{new Date(i.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`badge ${i.level==='ERROR'||i.level==='CRITICAL' ? 'badge-red' : i.level==='WARNING' ? 'badge-yellow' : 'badge-green'}`}>{i.level}</span></td>
                  <td className="px-6 py-4">{i.module}</td>
                  <td className="px-6 py-4">{i.endpoint}</td>
                  <td className="px-6 py-4">{i.action}</td>
                  <td className="px-6 py-4">{i.user_id ?? ''}</td>
                  <td className="px-6 py-4">{i.role ?? ''}</td>
                  <td className="px-6 py-4">{i.request_id ?? ''}</td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td className="px-6 py-4" colSpan={8}>No logs found.</td></tr>
              )}
            </tbody>
          </table>

          <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
            <span>Showing {items.length} of {total}</span>
            <div className="flex gap-1">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Prev</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-lg mb-2">Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((s, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600 hover:shadow-md transition">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{s._id.level} • {s._id.module}</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{s.count}</h3>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-green-600">
                    <i className="fa-solid fa-chart-line text-xl"></i>
                  </div>
                </div>
              </div>
            ))}
            {stats.length===0 && <div className="text-sm text-gray-600">No stats.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
