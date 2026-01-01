import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/contexts/NotificationContext';
import { useBackButton } from '@/hooks/useBackButton';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const IDCardViewer: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);

  // Enable hardware back button
  useBackButton();

  useEffect(() => {
    const u = sessionStorage.getItem('idcard_view_url');
    console.log('[IDCardViewer] URL from sessionStorage:', u);

    if (u) {
      setUrl(u);
      setLoading(false);
    } else {
      console.warn('[IDCardViewer] No URL found, going back');
      showError('No ID card to display', 3000);
      navigate(-1);
    }

    // Cleanup on unmount
    return () => {
      const storedUrl = sessionStorage.getItem('idcard_view_url');
      if (storedUrl && storedUrl.startsWith('blob:')) {
        try {
          console.log('[IDCardViewer] Revoking blob URL');
          URL.revokeObjectURL(storedUrl);
        } catch (e) {
          console.warn('[IDCardViewer] Failed to revoke URL:', e);
        }
      }
      sessionStorage.removeItem('idcard_view_url');
    };
  }, [navigate, showError]);

  const handleDownload = async () => {
    if (!url) return;

    try {
      showInfo('📥 Downloading...', 0);
      console.log('[IDCardViewer] Starting download');

      // For Capacitor mobile app
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        // Fetch blob data
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Convert to base64
        const base64 = await blobToBase64(blob);
        
        // Save to device Downloads/CEM folder
        const filename = `id_card_${Date.now()}.pdf`;
        const result = await Filesystem.writeFile({
          path: `CEM/${filename}`,
          data: base64,
          directory: Directory.External,
          recursive: true,
        });

        console.log('[IDCardViewer] File saved:', result.uri);
        showSuccess(`✅ Saved: ${filename}`, 5000);

        // Optional: Share the file
        if (await Share.canShare()) {
          await Share.share({
            title: 'Farmer ID Card',
            url: result.uri,
          });
        }
      } else {
        // For web - trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'farmer_id_card.pdf';
        a.click();
        showSuccess('✅ Download started!', 4000);
      }
    } catch (error: any) {
      console.error('[IDCardViewer] Download failed:', error);
      showError('Download failed. Try again.', 4000);
    }
  };

  const handleShare = async () => {
    if (!url) return;

    try {
      showInfo('📤 Preparing to share...', 0);
      console.log('[IDCardViewer] Sharing ID card');

      if (await Share.canShare()) {
        // For blob/data URLs, save first then share
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          
          const filename = `id_card_${Date.now()}.pdf`;
          const result = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache, // Use cache for temporary sharing
            recursive: true,
          });

          await Share.share({
            title: 'Farmer ID Card',
            text: 'My Farmer ID Card',
            url: result.uri,
          });
        } else {
          // Direct URL share
          await Share.share({
            title: 'Farmer ID Card',
            url: url,
          });
        }
        showSuccess('✅ Shared successfully!', 3000);
      } else {
        showError('Sharing not supported on this device', 4000);
      }
    } catch (error: any) {
      console.error('[IDCardViewer] Share failed:', error);
      showError('Share failed. Try again.', 4000);
    }
  };

  // Helper: Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (loading || !url) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ID card...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
              <h1 className="text-2xl font-bold text-gray-800">🆔 ID Card Viewer</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
            <button
              onClick={handleDownload}
              className="bg-green-700 hover:bg-green-800 active:scale-95 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition"
            >
              <span>📥</span> Download
            </button>
            <button
              onClick={handleShare}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition"
            >
              <span>📤</span> Share
            </button>
          </div>
          
          {/* PDF Viewer */}
          {pdfError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Failed to load PDF</h3>
              <p className="text-gray-600 mb-6">The ID card could not be displayed</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setPdfError(false);
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Retry
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Download Instead
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '80vh', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: '#f9fafb'
            }}>
              {url.startsWith('data:') ? (
                // For data URLs (base64) - better for mobile
                <object
                  data={url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  onLoad={() => console.log('[IDCardViewer] PDF loaded (object)')}
                  onError={() => {
                    console.error('[IDCardViewer] PDF failed to load (object)');
                    setPdfError(true);
                  }}
                >
                  <iframe
                    src={url}
                    title="ID Card PDF"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    onLoad={() => console.log('[IDCardViewer] PDF loaded (iframe fallback)')}
                    onError={() => {
                      console.error('[IDCardViewer] PDF failed to load (iframe)');
                      setPdfError(true);
                    }}
                  />
                </object>
              ) : (
                // For blob/http URLs
                <iframe
                  src={url}
                  title="ID Card PDF"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  onLoad={() => console.log('[IDCardViewer] PDF loaded successfully')}
                  onError={() => {
                    console.error('[IDCardViewer] PDF failed to load');
                    setPdfError(true);
                    showError('Failed to load PDF', 4000);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDCardViewer;
