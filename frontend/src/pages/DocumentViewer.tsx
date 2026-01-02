import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const [path, setPath] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fullUrl, setFullUrl] = useState<string>('');

  useEffect(() => {
    console.log('[DocViewer] Component mounted');
    
    const storedPath = sessionStorage.getItem('doc_view_path');
    const storedTitle = sessionStorage.getItem('doc_view_title');
    
    console.log('[DocViewer] Path from sessionStorage:', storedPath);
    console.log('[DocViewer] Title:', storedTitle);

    if (!storedPath) {
      console.error('[DocViewer] No document path found');
      showError('No document to display', 3000);
      setTimeout(() => navigate(-1), 1500);
      return;
    }
    
    setPath(storedPath);
    if (storedTitle) setDocTitle(storedTitle);

    // Construct full URL
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000';
    const url = storedPath.startsWith('http')
      ? storedPath
      : storedPath.startsWith('/uploads') || storedPath.startsWith('/api')
      ? `${baseURL}${storedPath}`
      : `${baseURL}/${storedPath}`;
    
    console.log('[DocViewer] Full URL:', url);
    setFullUrl(url);
    setLoading(false);

    // Cleanup on unmount
    return () => {
      console.log('[DocViewer] Component unmounting');
      sessionStorage.removeItem('doc_view_path');
      sessionStorage.removeItem('doc_view_title');
    };
  }, [navigate, showError]);

  const handleDownload = async () => {
    if (!fullUrl) {
      showError('No document to download', 3000);
      return;
    }

    let downloadNotifId: string | undefined;
    try {
      downloadNotifId = showInfo('📥 Downloading...', 8000);
      console.log('[DocViewer] Downloading from:', fullUrl);

      // Check if Capacitor is available
      let isCapacitor = false;
      try {
        const { Capacitor } = await import('@capacitor/core');
        isCapacitor = Capacitor?.isNativePlatform?.() || false;
      } catch (e) {
        console.log('[DocViewer] Capacitor not available');
      }

      // Fetch with authentication
      const token = localStorage.getItem('access_token');
      const response = await fetch(fullUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('[DocViewer] Blob received, size:', blob.size);

      if (isCapacitor) {
        // Mobile download
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Determine file extension
        const ext = fullUrl.match(/\.(pdf|jpg|jpeg|png|gif|doc|docx)$/i)?.[1] || 'jpg';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${docTitle.replace(/\s+/g, '_')}_${timestamp}.${ext}`;

        try {
          const result = await Filesystem.writeFile({
            path: `CEM/${filename}`,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });

          const savedPath = (result as any).uri || `Documents/CEM/${filename}`;
          console.log('[DocViewer] ✅ File saved:', savedPath);
          
          if (downloadNotifId) dismiss(downloadNotifId);
          showSuccess(`✅ Saved to:\n${savedPath}`, 6000);

          // Try to share
          try {
            const { Share } = await import('@capacitor/share');
            if (await Share.canShare()) {
              await Share.share({
                title: docTitle,
                url: result.uri,
              });
            }
          } catch (shareErr) {
            console.log('[DocViewer] Share not available');
          }
        } catch (fsErr) {
          console.error('[DocViewer] Filesystem error:', fsErr);
          throw new Error('Failed to save file. Check storage permissions.');
        }
      } else {
        // Web download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${docTitle.replace(/\s+/g, '_')}.${fullUrl.match(/\.(pdf|jpg|jpeg|png)$/i)?.[1] || 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        if (downloadNotifId) dismiss(downloadNotifId);
        showSuccess('✅ Download started!', 4000);
        console.log('[DocViewer] ✅ Web download completed');
      }
    } catch (error: any) {
      console.error('[DocViewer] ❌ Download failed:', error);
      if (downloadNotifId) dismiss(downloadNotifId);
      showError(error.message || 'Download failed. Please try again.', 5000);
    }
  };

  const handleRetry = () => {
    console.log('[DocViewer] Retrying...');
    setImageError(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!fullUrl) return null;

  const isPDF = fullUrl.toLowerCase().endsWith('.pdf');

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{docTitle}</h1>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition active:scale-95"
            >
              📥 Download
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          {isPDF ? (
            <iframe 
              src={fullUrl} 
              title="Document" 
              style={{ width: '100%', height: '75vh', minHeight: '500px', border: 'none', borderRadius: '8px' }}
              onLoad={() => console.log('[DocViewer] ✅ PDF loaded')}
              onError={() => {
                console.error('[DocViewer] ❌ PDF failed to load');
                showError('Failed to load PDF', 4000);
              }}
            />
          ) : imageError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Image</h3>
              <p className="text-gray-600 mb-6">The document could not be displayed</p>
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
            <div className="flex justify-center">
              <img 
                src={fullUrl} 
                alt={docTitle}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                onLoad={() => {
                  console.log('[DocViewer] ✅ Image loaded successfully');
                }}
                onError={(e) => {
                  console.error('[DocViewer] ❌ Image failed to load:', fullUrl);
                  setImageError(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
