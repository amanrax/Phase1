// src/pages/DocumentViewer.tsx
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
    
    console.log('[DocViewer] URL from sessionStorage:', storedUrl?.substring(0, 80));
    console.log('[DocViewer] URL type:', storedUrl?.startsWith('blob:') ? 'Blob URL' : storedUrl?.startsWith('data:') ? 'Data URL' : storedUrl?.startsWith('http') ? 'HTTP URL' : 'Unknown');
    console.log('[DocViewer] Title:', storedTitle);

    if (!storedUrl) {
      console.error('[DocViewer] No document URL found');
      showError('No document to display', 3000);
      setTimeout(() => navigate(-1), 1500);
      return;
    }
    
    setDocUrl(storedUrl);
    if (storedTitle) setDocTitle(storedTitle);
    setLoading(false);

    return () => {
      console.log('[DocViewer] Component unmounting');
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
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const response = await fetch(docUrl);
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
          // ✅ TRY 1: External storage (Downloads folder) - Most user-friendly
          console.log('[DocViewer] Attempting to save to Downloads folder...');
          const result = await Filesystem.writeFile({
            path: filename, // No subdirectory for Downloads
            data: base64,
            directory: Directory.External,
            recursive: false,
          });

          const savedPath = (result as any).uri || `Downloads/${filename}`;
          console.log('[DocViewer] ✅ File saved to Downloads:', savedPath);
          
          if (downloadNotifId) dismiss(downloadNotifId);
          showSuccess(
            `✅ Document Downloaded!\n\n📂 Location: Downloads folder\n📄 File: ${filename}\n\n💡 Open your File Manager app to view it.`,
            8000
          );

        } catch (fsErr: any) {
          console.error('[DocViewer] External storage write failed:', fsErr);
          
          // ✅ TRY 2: Documents/CEM folder - Fallback
          try {
            console.log('[DocViewer] Trying Documents folder as fallback...');
            const fallbackResult = await Filesystem.writeFile({
              path: `CEM/${filename}`,
              data: base64,
              directory: Directory.Documents,
              recursive: true,
            });
            
            const fallbackPath = (fallbackResult as any).uri || `Documents/CEM/${filename}`;
            console.log('[DocViewer] ✅ Saved to Documents folder:', fallbackPath);
            
            if (downloadNotifId) dismiss(downloadNotifId);
            showSuccess(
              `✅ Document Saved!\n\n📂 Location: Documents/CEM/${filename}\n\n💡 Open "Files" app > Documents > CEM folder`,
              8000
            );
          } catch (docErr: any) {
            console.error('[DocViewer] Both External and Documents failed:', docErr);
            if (downloadNotifId) dismiss(downloadNotifId);
            
            // Show helpful error message
            const errorMsg = docErr.message || 'Storage access denied';
            if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
              showError(
                '❌ Storage Permission Required\n\nGo to: Settings > Apps > CEM > Permissions > Storage\nEnable "Files and Media" access.',
                10000
              );
            } else {
              showError(`Failed to save file: ${errorMsg}`, 5000);
            }
          }
        }
      } else {
        // Web browser download
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
        showSuccess('✅ Download started! Check your Downloads folder.', 4000);
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

  // Detect if it's a PDF by checking the URL and content type hints
  const isPDF = docUrl.toLowerCase().includes('.pdf') || 
                docUrl.includes('application/pdf') || 
                docUrl.includes('data:application/pdf');

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
                onLoad={() => console.log('[DocViewer] ✅ Image loaded')}
                onError={() => {
                  console.error('[DocViewer] ❌ Image failed to load');
                  setViewError(true);
                }}
              />
            </div>
          )}
          
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> {isNative 
                ? 'On mobile, files are saved to your Downloads folder. Open your File Manager app to access downloaded documents.'
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
