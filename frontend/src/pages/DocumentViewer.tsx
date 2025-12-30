import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const p = sessionStorage.getItem('doc_view_path');
    if (!p) {
      navigate(-1);
      return;
    }
    setPath(p);

    return () => {
      sessionStorage.removeItem('doc_view_path');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!path) return null;

  // If path is a full URL, use it directly; otherwise construct absolute URL
  const src = path.startsWith('http')
    ? path
    : path.startsWith('/uploads')
    ? `${import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000'}${path}`
    : `${import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000'}/${path}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-green-700 hover:text-green-800 font-bold text-sm">
                ← BACK
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Document Viewer</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
          {src.endsWith('.pdf') ? (
            <object data={src} type="application/pdf" width="100%" height="800px">
              <iframe src={src} title="Document" width="100%" height="800px" />
            </object>
          ) : (
            <img src={src} alt="Document" style={{ width: '100%', height: 'auto' }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
