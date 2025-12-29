import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const IDCardViewer: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = sessionStorage.getItem('idcard_view_url');
    if (u) setUrl(u);
    else {
      // nothing to show, go back
      navigate(-1);
    }

    return () => {
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
        sessionStorage.removeItem('idcard_view_url');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!url) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-green-700 hover:text-green-800 font-bold text-sm">
                ← BACK
              </button>
              <h1 className="text-2xl font-bold text-gray-800">ID Card Viewer</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <object data={url} type="application/pdf" width="100%" height="800px">
            <iframe src={url} title="ID Card" width="100%" height="800px" />
          </object>
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;
