import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackButton } from '@/hooks/useBackButton';
import { useNotification } from '@/contexts/NotificationContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Enable hardware back button
  useBackButton();

  useEffect(() => {
    const p = sessionStorage.getItem('doc_view_path');
    console.log('[DocViewer] Loading document path:', p);
    
    if (!p) {
      console.error('[DocViewer] No document path found');
      showError('No document to display', 3000);
      navigate(-1);
      return;
    }
    
    setPath(p);
    setLoading(false);

    // Cleanup on unmount only
    return () => {
      sessionStorage.removeItem('doc_view_path');
    };
  }, [navigate, showError]);

  const handleDownload = async () => {
    if (!path) return;

    try {
      const downloadNotifId = showInfo('📥 Downloading...', 8000);
      
      // Construct full URL
      const src = path.startsWith('http')
        ? path
        : path.startsWith('/uploads')
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000'}${path}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000'}/${path}`;

      console.log('[DocViewer] Downloading from:', src);

      // Fetch the file
      const response = await fetch(src);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      // Determine file extension
      const ext = path.endsWith('.pdf') ? 'pdf' : 'jpg';
      const filename = `document_${Date.now()}.${ext}`;

      // Save to Downloads/CEM folder
      const result = await Filesystem.writeFile({
        path: `CEM/${filename}`,
        data: base64,
        directory: Directory.External,
        recursive: true,
      });

      console.log('[DocViewer] File saved:', result.uri);
      if (downloadNotifId) dismiss(downloadNotifId);
      showSuccess(`Saved: ${filename}`, 5000);

      // Optional: Share the file
      if (await Share.canShare()) {
        await Share.share({
          title: 'Document',
          url: result.uri,
        });
      }
    } catch (error: any) {
      console.error('[DocViewer] Download failed:', error);
      if (downloadNotifId) dismiss(downloadNotifId);
      showError('Download failed. Try again.', 4000);
    }
  };

  // Helper: Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

  if (!path) return null;

  // Construct full URL
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000';
  const src = path.startsWith('http')
    ? path
    : path.startsWith('/uploads')
    ? `${baseURL}${path}`
    : `${baseURL}/${path}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="text-green-700 hover:text-green-800 font-bold text-sm transition"
              >
                ← BACK
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Document Viewer</h1>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
          {src.endsWith('.pdf') ? (
            <object 
              data={src} 
              type="application/pdf" 
              width="100%" 
              height="800px"
              onLoad={() => console.log('[DocViewer] PDF loaded')}
            >
              <iframe 
                src={src} 
                title="Document" 
                width="100%" 
                height="800px"
                onLoad={() => console.log('[DocViewer] PDF iframe loaded')}
              />
            </object>
          ) : imageError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-600 mb-4">Failed to load image</p>
              <button
                onClick={() => {
                  setImageError(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : (
            <img 
              src={src} 
              alt="Document"
              crossOrigin="use-credentials"
              style={{ width: '100%', height: 'auto', maxWidth: '100%', objectFit: 'contain' }}
              onLoad={() => {
                console.log('[DocViewer] Image loaded successfully');
                setLoading(false);
              }}
              onError={(e) => {
                console.error('[DocViewer] Image failed to load:', src);
                console.error('[DocViewer] Error event:', e);
                setImageError(true);
                showError('Failed to load image', 4000);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
