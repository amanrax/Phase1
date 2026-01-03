// src/pages/IDCardViewer.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';

const IDCardViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const [url, setUrl] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string>('Farmer');
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    console.log('[IDCardViewer] Component mounted');
    
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setIsNative(Capacitor?.isNativePlatform?.() || false);
      } catch (e) {
        setIsNative(false);
      }
    };
    
    checkPlatform();
    
    const storedUrl = sessionStorage.getItem('idcard_view_url');
    const storedName = sessionStorage.getItem('idcard_farmer_name');
    
    console.log('[IDCardViewer] URL from sessionStorage:', storedUrl?.substring(0, 50));
    console.log('[IDCardViewer] Farmer name:', storedName);

    if (!storedUrl) {
      console.error('[IDCardViewer] No URL found in sessionStorage');
      showError('No ID card to display. Please try again.', 4000);
      setTimeout(() => navigate(-1), 1500);
      return;
    }

    setUrl(storedUrl);
    if (storedName) setFarmerName(storedName);
    setLoading(false);

    return () => {
      console.log('[IDCardViewer] Component unmounting, cleaning up');
      const u = sessionStorage.getItem('idcard_view_url');
      if (u && u.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(u);
          console.log('[IDCardViewer] Blob URL revoked');
        } catch (e) {
          console.warn('[IDCardViewer] Failed to revoke URL:', e);
        }
      }
      sessionStorage.removeItem('idcard_view_url');
      sessionStorage.removeItem('idcard_farmer_name');
    };
  }, [navigate, showError]);

  const handleDownload = async () => {
    if (!url) {
      showError('No PDF to download', 3000);
      return;
    }

    let downloadNotifId: string | undefined;
    try {
      downloadNotifId = showInfo('📥 Downloading...', 8000);
      console.log('[IDCardViewer] Starting download');

      if (isNative) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const response = await fetch(url);
        const blob = await response.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ID_Card_${farmerName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        
        try {
          const result = await Filesystem.writeFile({
            path: `CEM/${filename}`,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });

          const savedPath = (result as any).uri || `Documents/CEM/${filename}`;
          console.log('[IDCardViewer] ✅ File saved:', savedPath);
          
          if (downloadNotifId) dismiss(downloadNotifId);
          showSuccess(`✅ Saved to:\n${savedPath}`, 6000);

        } catch (fsErr) {
          console.error('[IDCardViewer] Filesystem write failed:', fsErr);
          throw new Error('Failed to save file. Check storage permissions.');
        }
      } else {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ID_Card_${farmerName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        if (downloadNotifId) dismiss(downloadNotifId);
        showSuccess('✅ Download started! Check your Downloads folder.', 4000);
        console.log('[IDCardViewer] ✅ Web download completed');
      }
    } catch (error: any) {
      console.error('[IDCardViewer] ❌ Download failed:', error);
      if (downloadNotifId) dismiss(downloadNotifId);
      showError(error.message || 'Download failed. Please try again.', 5000);
    }
  };

  const handleRetry = () => {
    console.log('[IDCardViewer] Retrying...');
    setPdfError(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ID card...</p>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No ID Card Found</h3>
          <p className="text-gray-600 mb-6">Unable to load the ID card</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="text-green-700 hover:text-green-800 font-bold text-sm transition active:scale-95"
              >
                ← BACK
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                🆔 {farmerName}'s ID Card
              </h1>
            </div>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition text-sm sm:text-base"
            >
              <span>📥</span> Download
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          {pdfError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Failed to Load PDF</h3>
              <p className="text-gray-600 mb-6">The ID card could not be displayed in your browser</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition active:scale-95"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95"
                >
                  📥 Download Instead
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '75vh', 
              minHeight: '500px',
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: '#f9fafb'
            }}>
              {url.startsWith('data:') ? (
                <embed
                  src={url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  onLoad={() => console.log('[IDCardViewer] ✅ PDF loaded (embed)')}
                  onError={() => {
                    console.error('[IDCardViewer] ❌ PDF failed to load (embed)');
                    setPdfError(true);
                  }}
                />
              ) : (
                <iframe
                  src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                  title="ID Card PDF"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  onLoad={() => console.log('[IDCardViewer] ✅ PDF loaded (iframe)')}
                  onError={() => {
                    console.error('[IDCardViewer] ❌ PDF failed to load (iframe)');
                    setPdfError(true);
                  }}
                />
              )}
            </div>
          )}
          
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> {isNative 
                ? 'Files are saved to Documents/CEM folder. If the PDF doesn\'t display, click "Download" to save it.'
                : 'If the PDF doesn\'t display, click "Download" to save it to your device.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;
