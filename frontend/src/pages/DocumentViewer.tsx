// src/pages/DocumentViewer.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';
import BackButton from '@/components/BackButton';
import { logger } from '@/utils/logger';

const COMPONENT = 'DocumentViewer';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [loading, setLoading] = useState(true);
  const [viewError, setViewError] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [viewingNatively, setViewingNatively] = useState(false);

  useEffect(() => {
    logger.info(COMPONENT, 'Component mounted');
    
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const native = Capacitor?.isNativePlatform?.() || false;
        setIsNative(native);
        
        // If mobile, offer native app opening
        if (native) {
          logger.info(COMPONENT, 'Mobile detected');
        }
      } catch (e) {
        setIsNative(false);
      }
    };
    
    checkPlatform();
    
    const storedUrl = sessionStorage.getItem('doc_view_path');
    const storedTitle = sessionStorage.getItem('doc_view_title');
    
    logger.info(COMPONENT, 'URL from sessionStorage', { urlPrefix: storedUrl?.substring(0, 80), title: storedTitle });

    if (!storedUrl) {
      logger.error(COMPONENT, 'No document URL found');
      showError('No document to display', 3000);
      setTimeout(() => navigate(-1), 1500);
      return;
    }
    
    setDocUrl(storedUrl);
    if (storedTitle) setDocTitle(storedTitle);
    setLoading(false);

    return () => {
      logger.info(COMPONENT, 'Component unmounting');
      if (storedUrl && storedUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(storedUrl);
          logger.info(COMPONENT, 'Blob URL revoked');
        } catch (e) {
          logger.warn(COMPONENT, 'Failed to revoke URL', { error: e });
        }
      }
      sessionStorage.removeItem('doc_view_path');
      sessionStorage.removeItem('doc_view_title');
    };
  }, [navigate, showError]);

  // Download document and show instructions to open
  const handleOpenWithApp = async () => {
    if (!docUrl) {
      showError('No document available', 3000);
      return;
    }

    try {
      setViewingNatively(true);
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
      
      // Determine file extension
      const contentType = blob.type || '';
      const ext = contentType.includes('pdf') ? 'pdf' 
        : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
        : contentType.includes('png') ? 'png'
        : 'file';
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${docTitle.replace(/\s+/g, '_')}_${timestamp}.${ext}`;
      
      // Save to Downloads folder
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.External,
        recursive: false,
      });
      
      logger.info(COMPONENT, 'Saved to Downloads', { filename });
      
      setViewingNatively(false);
      showSuccess(`Saved to Downloads\n\nTap notification or open File Manager > Downloads > ${filename}`, 6000);
      
    } catch (error) {
      logger.error(COMPONENT, 'Failed to save', { error });
      setViewingNatively(false);
      showError('Could not save document. Try downloading instead.', 4000);
    }
  };

  const handleDownload = async () => {
    if (!docUrl) {
      showError('No document to download', 3000);
      return;
    }

    let downloadNotifId: string | undefined;
    try {
      downloadNotifId = showInfo('Downloading...', 5000);
      logger.info(COMPONENT, 'Starting download');

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
          logger.info(COMPONENT, 'Attempting to save to Downloads folder');
          const result = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.External,
            recursive: false,
          });

          const savedPath = (result as any).uri || `Downloads/${filename}`;
          logger.info(COMPONENT, 'File saved to Downloads', { savedPath });
          
          if (downloadNotifId) dismiss(downloadNotifId);
          showSuccess('Saved to Downloads', 3000);

        } catch (fsErr: any) {
          logger.error(COMPONENT, 'External storage write failed', { error: fsErr });
          
          try {
            logger.info(COMPONENT, 'Trying Documents folder as fallback');
            const fallbackResult = await Filesystem.writeFile({
              path: `CEM/${filename}`,
              data: base64,
              directory: Directory.Documents,
              recursive: true,
            });
            
            const fallbackPath = (fallbackResult as any).uri || `Documents/CEM/${filename}`;
            logger.info(COMPONENT, 'Saved to Documents folder', { fallbackPath });
            
            if (downloadNotifId) dismiss(downloadNotifId);
            showSuccess('Saved to Documents/CEM', 3000);
          } catch (docErr: any) {
            logger.error(COMPONENT, 'Both External and Documents failed', { error: docErr });
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
        showSuccess('Download started! Check your Downloads folder.', 4000);
        logger.info(COMPONENT, 'Web download completed');
      }
    } catch (error: any) {
      logger.error(COMPONENT, 'Download failed', { error });
      if (downloadNotifId) dismiss(downloadNotifId);
      showError(error.message || 'Download failed. Please try again.', 5000);
    }
  };

  const handleRetry = () => {
    logger.info(COMPONENT, 'Retrying');
    setViewError(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{docTitle}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
          {viewError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Failed to Load Document</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">The document could not be displayed</p>
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
          ) : isPDF && isNative ? (
            // Mobile PDF: Show options to open or download
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                {viewingNatively ? 'Saving...' : 'Document Ready'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {viewingNatively 
                  ? 'Saving to Downloads folder...' 
                  : 'Save to Downloads and open with your preferred viewer'}
              </p>
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <button
                  onClick={handleOpenWithApp}
                  disabled={viewingNatively}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📥 Save to Downloads
                </button>
                <button
                  onClick={handleDownload}
                  disabled={viewingNatively}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📥 Download to Device
                </button>
                <button
                  onClick={() => navigate(-1)}
                  disabled={viewingNatively}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
              </div>
              <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 text-left max-w-sm mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> After saving, tap the notification or open File Manager &gt; Downloads to view the file
                </p>
              </div>
            </div>
          ) : isPDF ? (
            // Desktop PDF viewer
            <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800" style={{ height: '75vh', minHeight: '500px' }}>
              <iframe 
                src={`${docUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                title="Document" 
                className="w-full h-full border-0"
                onLoad={() => logger.info(COMPONENT, 'PDF loaded')}
                onError={() => {
                  logger.error(COMPONENT, 'PDF failed to load');
                  setViewError(true);
                }}
              />
            </div>
          ) : (
            // Image viewer (works on both mobile and desktop)
            <div className="flex justify-center">
              <img 
                src={docUrl} 
                alt={docTitle}
                className="max-w-full h-auto rounded-lg"
                onLoad={() => logger.info(COMPONENT, 'Image loaded')}
                onError={() => {
                  logger.error(COMPONENT, 'Image failed to load');
                  setViewError(true);
                }}
              />
            </div>
          )}
          
          {!isNative && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>💡 Tip:</strong> If the document doesn't display, click "Download" to save it to your device.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
