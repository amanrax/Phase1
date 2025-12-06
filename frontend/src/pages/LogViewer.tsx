import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLogs, fetchLogStats, exportCsv, LogItem } from '../services/logs.service';

const levels = ['DEBUG','INFO','WARNING','ERROR','CRITICAL'] as const;

export const LogViewer: React.FC = () => {
  const navigate = useNavigate();
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
    <div className="fade-in p-4 sm:p-6 lg:p-8">
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/admin-dashboard")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">📋 System Logs</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Level</label>
            <select value={level} onChange={e=>setLevel(e.target.value)} className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm">
              <option value="">All</option>
              {levels.map(l=> <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Module</label>
            <input value={module} onChange={e=>setModule(e.target.value)} className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="middleware, auth, farmers" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">User</label>
            <input value={userId} onChange={e=>setUserId(e.target.value)} className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="email or id" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Role</label>
            <input value={role} onChange={e=>setRole(e.target.value)} className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm" placeholder="ADMIN, OPERATOR, FARMER" />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition shadow-lg text-sm sm:text-base">
              <i className="fa-solid fa-rotate mr-2"/> Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
            <button onClick={downloadCsv} className="w-full sm:w-auto bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm"><i className="fa-solid fa-file-csv mr-2"/> Export CSV</button>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 w-full sm:w-auto">Total: {total}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-3 sm:gap-4">
            <h3 className="font-bold text-base sm:text-lg">Logs</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="p-2 border rounded-lg text-xs sm:text-sm w-full sm:w-auto">
                {[10,20,50,100].map(n=> <option key={n} value={n}>{n}/page</option>)}
              </select>
              <div className="flex gap-1 w-full sm:w-auto">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 text-xs sm:text-sm">Prev</button>
                <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm flex items-center">{page} / {totalPages}</span>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 text-xs sm:text-sm">Next</button>
              </div>
            </div>
          </div>
          <table className="w-full text-left text-xs sm:text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs sticky top-0">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Timestamp</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Level</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Module</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Endpoint</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Action</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">User</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Role</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 whitespace-nowrap">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((i, idx) => (
                <tr key={idx} className="hover:bg-green-50 transition">
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs">{new Date(i.timestamp).toLocaleString()}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap"><span className={`badge ${i.level==='ERROR'||i.level==='CRITICAL' ? 'badge-red' : i.level==='WARNING' ? 'badge-yellow' : 'badge-green'}`}>{i.level}</span></td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">{i.module}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">{i.endpoint}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">{i.action}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">{i.user_id ?? ''}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">{i.role ?? ''}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs">{i.request_id ?? ''}</td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td className="px-3 sm:px-6 py-2 sm:py-4" colSpan={8}>No logs found.</td></tr>
              )}
            </tbody>
          </table>

          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <span>Showing {items.length} of {total}</span>
            <div className="flex gap-1 w-full sm:w-auto">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Prev</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((s, idx) => (
              <div key={idx} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border-l-4 border-green-600 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{s._id.level} • {s._id.module}</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{s.count}</h3>
                  </div>
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg text-green-600 flex-shrink-0">
                    <i className="fa-solid fa-chart-line text-lg sm:text-xl"></i>
                  </div>
                </div>
              </div>
            ))}
            {stats.length===0 && <div className="text-xs sm:text-sm text-gray-600">No stats.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
