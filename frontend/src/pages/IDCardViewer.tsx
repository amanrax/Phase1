import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const IDCardViewer: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = sessionStorage.getItem('idcard_view_url');
    console.log('[IDCardViewer] URL from sessionStorage:', u);

    if (u) {
      setUrl(u);
      setLoading(false);
    } else {
      console.warn('[IDCardViewer] No URL found, going back');
      navigate(-1);
    }

    return () => {
      // Cleanup on unmount
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke URL:', e);
        }
      }
      sessionStorage.removeItem('idcard_view_url');
    };
  }, [navigate]);

  if (loading || !url) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-600">Loading ID card...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="text-green-700 hover:text-green-800 font-bold text-sm"
              >
                ← BACK
              </button>
              <h1 className="text-2xl font-bold text-gray-800">ID Card Viewer</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-end gap-3 mb-4">
            <a
              href={url}
              download="farmer_id_card.pdf"
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"
            >
              <span>⬇️</span> Download
            </a>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              ← Back
            </button>
          </div>
          
          {/* PDF Viewer */}
          <div style={{ width: '100%', height: '80vh', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {url.startsWith('data:') ? (
              // For data URLs (base64), use object tag
              <object
                data={url}
                type="application/pdf"
                width="100%"
                height="100%"
              >
                <iframe
                  src={url}
                  title="ID Card PDF"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </object>
            ) : (
              // For blob URLs, use iframe
              <iframe
                src={url}
                title="ID Card PDF"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;
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
          <div className="flex items-center justify-end gap-3 mb-4">
            <a
              href={url}
              download="id_card.pdf"
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg"
            >
              ⬇️ Download
            </a>
            <button
              onClick={() => {
                try { URL.revokeObjectURL(url); } catch {}
                navigate(-1);
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              ← Back
            </button>
          </div>
          <div style={{ width: '100%', height: '80vh' }}>
            <iframe
              src={url}
              title="ID Card"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;
