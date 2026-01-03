// src/components/DocumentViewer.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [loading, setLoading] = useState(true);
  const [viewError, setViewError] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    console.log('[DocViewer] Component mounted');
    
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setIsNative(Capacitor?.isNativePlatform?.() || false);
      } catch (e) {
        setIsNative(false);
      }
    };
    
    checkPlatform();
    
    const storedUrl = sessionStorage.getItem('doc_view_path');
    const storedTitle = sessionStorage.getItem('doc_view_title');
    
    console.log('[DocViewer] URL from sessionStorage:', storedUrl?.substring(0, 50));
    console.log('[DocViewer] Title:', storedTitle);

    if (!storedUrl) {
      console.error('[DocViewer] No document URL found');
      showError('No document to display', 3000);
      setTimeout(() => navigate(-1), 1500);
      return;
    }
    
    // Use the blob URL directly (already created by FarmerIDCard)
    setDocUrl(storedUrl);
    if (storedTitle) setDocTitle(storedTitle);
    setLoading(false);

    // Cleanup on unmount
    return () => {
      console.log('[DocViewer] Component unmounting');
      // Revoke blob URL if it's a blob
      if (storedUrl && storedUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(storedUrl);
          console.log('[DocViewer] Blob URL revoked');
        } catch (e) {
          console.warn('[DocViewer] Failed to revoke URL:', e);
        }
      }
      sessionStorage.removeItem('doc_view_path');
      sessionStorage.removeItem('doc_view_title');
    };
  }, [navigate, showError]);

  const openInNativeApp = async () => {
    if (!docUrl) return;

    let notifId: string | undefined;
    try {
      notifId = showInfo('📱 Opening in external viewer...', 5000);
      
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { FileOpener } = await import('@capacitor-community/file-opener');
      
      // Fetch blob data
      const response = await fetch(docUrl);
      const blob = await response.blob();
      
      // Determine content type
      const contentType = blob.type || 'application/octet-stream';
      
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
      
      // Determine extension
      const ext = contentType.includes('pdf') ? 'pdf' 
        : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
        : contentType.includes('png') ? 'png'
        : contentType.includes('gif') ? 'gif'
        : 'file';
      
      // Save temp file
      const filename = `${docTitle.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      
      console.log('[DocViewer] Temp file saved, opening...');
      
      // Open with native app
      await FileOpener.open({
        filePath: result.uri,
        contentType: contentType,
      });
      
      if (notifId) dismiss(notifId);
      console.log('[DocViewer] ✅ Opened in native app');
    } catch (error: any) {
      console.error('[DocViewer] Failed to open in native app:', error);
      if (notifId) dismiss(notifId);
      showError('Failed to open in external viewer. Try downloading instead.', 5000);
    }
  };

  const handleDownload = async () => {
    if (!docUrl) {
      showError('No document to download', 3000);
      return;
    }

    let downloadNotifId: string | undefined;
    try {
      downloadNotifId = showInfo('📥 Downloading...', 8000);
      console.log('[DocViewer] Starting download');

      if (isNative) {
        // Mobile download
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Fetch blob data
        const response = await fetch(docUrl);
        const blob = await response.blob();
        
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

        // Determine file extension from blob type
        const contentType = blob.type || '';
        const ext = contentType.includes('pdf') ? 'pdf' 
          : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
          : contentType.includes('png') ? 'png'
          : contentType.includes('gif') ? 'gif'
          : 'file';
        
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

          // Try to open with native app
          try {
            const { FileOpener } = await import('@capacitor-community/file-opener');
            const openNotif = showInfo('📱 Opening file...', 3000);
            await FileOpener.open({
              filePath: result.uri,
              contentType: contentType || 'application/octet-stream',
            });
            dismiss(openNotif);
          } catch (openErr) {
            console.log('[DocViewer] Could not auto-open file');
          }
        } catch (fsErr) {
          console.error('[DocViewer] Filesystem error:', fsErr);
          throw new Error('Failed to save file. Check storage permissions.');
        }
      } else {
        // Web download
        const response = await fetch(docUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Determine extension
        const contentType = blob.type || '';
        const ext = contentType.includes('pdf') ? 'pdf' 
          : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
          : contentType.includes('png') ? 'png'
          : 'file';
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${docTitle.replace(/\s+/g, '_')}.${ext}`;
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
    setViewError(false);
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

  if (!docUrl) return null;

  const isPDF = docUrl.includes('pdf') || docUrl.toLowerCase().includes('application/pdf');
  const isImage = docUrl.includes('image/') || /\.(jpg|jpeg|png|gif)$/i.test(docUrl);

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
            <div className="flex gap-2">
              {isNative && (
                <button
                  onClick={openInNativeApp}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition active:scale-95"
                >
                  📱 Open
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition active:scale-95"
              >
                📥 Download
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          {viewError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Document</h3>
              <p className="text-gray-600 mb-6">The document could not be displayed</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition active:scale-95"
                >
                  🔄 Retry
                </button>
                {isNative && (
                  <button
                    onClick={openInNativeApp}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition active:scale-95"
                  >
                    📱 Open in App
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95"
                >
                  📥 Download Instead
                </button>
              </div>
            </div>
          ) : isPDF ? (
            <div style={{ 
              width: '100%', 
              height: '75vh', 
              minHeight: '500px',
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: '#f9fafb'
            }}>
              <iframe 
                src={`${docUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                title="Document" 
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={() => console.log('[DocViewer] ✅ PDF loaded')}
                onError={() => {
                  console.error('[DocViewer] ❌ PDF failed to load');
                  setViewError(true);
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <img 
                src={docUrl} 
                alt={docTitle}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                onLoad={() => {
                  console.log('[DocViewer] ✅ Image loaded successfully');
                }}
                onError={(e) => {
                  console.error('[DocViewer] ❌ Image failed to load:', docUrl);
                  setViewError(true);
                }}
              />
            </div>
          )}
          
          {/* Help Text */}
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> {isNative 
                ? 'If the document doesn\'t display, use "Open in App" or "Download" buttons above.'
                : 'If the document doesn\'t display, click "Download" to save it to your device.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
