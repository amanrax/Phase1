import { useRef, useState, useEffect } from "react";
import { farmerService } from "@/services/farmer.service";

interface FarmerIDCardPreviewProps {
  farmer: {
    farmer_id: string;
    personal_info?: {
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
      gender?: string;
      nrc?: string;
      phone_primary?: string;
    };
    address?: {
      province_name?: string;
      district_name?: string;
      village?: string;
      chiefdom_name?: string;
    };
    documents?: {
      photo?: string;
    };
    created_at?: string;
    created_by?: string;
    qr_code_path?: string;
    qr_code_url?: string;
    qr_code_file_id?: string;
    photo_file_id?: string;
  };
  onClose?: () => void;
}

export default function FarmerIDCardPreview({ farmer, onClose }: FarmerIDCardPreviewProps) {
  const [showBack, setShowBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(true);

  // Load QR code using the service
  useEffect(() => {
    let mounted = true;
    
    const loadQR = async () => {
      try {
        setQrLoading(true);
        const url = await farmerService.getQRCodeBlobUrl(farmer);
        if (mounted && url) {
          setQrCodeUrl(url);
          console.log('[Preview] QR code loaded');
        }
      } catch (error) {
        console.error('[Preview] Failed to load QR code:', error);
      } finally {
        if (mounted) setQrLoading(false);
      }
    };

    loadQR();

    return () => {
      mounted = false;
      // Cleanup blob URL
      if (qrCodeUrl && qrCodeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [farmer?.farmer_id]);

  // Load photo using the service
  useEffect(() => {
    let mounted = true;
    
    const loadPhoto = async () => {
      try {
        setPhotoLoading(true);
        const url = await farmerService.getPhotoUrl(farmer);
        if (mounted && url) {
          setPhotoUrl(url);
          console.log('[Preview] Photo loaded');
        }
      } catch (error) {
        console.error('[Preview] Failed to load photo:', error);
      } finally {
        if (mounted) setPhotoLoading(false);
      }
    };

    loadPhoto();

    return () => {
      mounted = false;
      // Cleanup blob URL
      if (photoUrl && photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [farmer?.farmer_id]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
        overflow: 'auto'
      }}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '95vw',
          width: '100%',
          padding: '24px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: '#9ca3af',
              fontSize: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            🆔 Farmer ID Card Preview
          </h2>
          <p style={{ color: '#6b7280', fontSize: 'clamp(14px, 4vw, 16px)' }}>
            {farmer.personal_info?.first_name} {farmer.personal_info?.last_name}
          </p>
        </div>

        {/* Card Display */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', perspective: '1000px' }}>
            {/* ID Card */}
            <div
              ref={cardRef}
              style={{
                width: '428px',
                height: '270px',
                position: 'relative',
                transition: 'transform 0.7s',
                transformStyle: 'preserve-3d',
                transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* FRONT SIDE */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  display: showBack ? 'none' : 'block'
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #15803d 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  border: '4px solid white'
                }}>
                  {/* Header Strip */}
                  <div style={{
                    background: 'linear-gradient(90deg, #14532d 0%, #15803d 100%)',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>🌾</span>
                      <div>
                        <p style={{ color: 'white', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                          Chiefdom Enterprise Program
                        </p>
                        <p style={{ color: '#bbf7d0', fontSize: '9px', fontWeight: '600', margin: 0 }}>
                          MWasree Enterprises Limited
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>CHIEFDOM</p>
                      <p style={{ color: '#bbf7d0', fontSize: '8px', margin: 0 }}>
                        Farmer Registry
                      </p>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div style={{ padding: '16px 24px', display: 'flex', gap: '16px' }}>
                    {/* Photo */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: '96px',
                        height: '112px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '3px solid white',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {photoLoading ? (
                          <div style={{ fontSize: '24px' }}>⏳</div>
                        ) : photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Farmer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#e5e7eb',
                            color: '#9ca3af',
                            fontSize: '36px'
                          }}>
                            👤
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, color: 'white' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '9px', color: '#bbf7d0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>
                          Name
                        </p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2, margin: 0 }}>
                          {farmer.personal_info?.first_name} {farmer.personal_info?.last_name}
                        </p>
                        {/* Separator line under NAME */}
                        <div style={{ width: '100%', height: '1px', background: 'rgba(187, 247, 208, 0.3)', marginTop: '4px' }}></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '8px', color: '#bbf7d0', fontWeight: '600', margin: '0 0 2px 0' }}>
                            FARMER ID
                          </p>
                          <p style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', margin: 0 }}>
                            {farmer.farmer_id}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '8px', color: '#bbf7d0', fontWeight: '600', margin: '0 0 2px 0' }}>
                            NRC
                          </p>
                          <p style={{ fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>
                            {farmer.personal_info?.nrc || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '8px', color: '#bbf7d0', fontWeight: '600', margin: '0 0 2px 0' }}>
                            DOB
                          </p>
                          <p style={{ fontSize: '11px', margin: 0 }}>
                            {farmer.personal_info?.date_of_birth
                              ? new Date(farmer.personal_info.date_of_birth).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '8px', color: '#bbf7d0', fontWeight: '600', margin: '0 0 2px 0' }}>
                            GENDER
                          </p>
                          <p style={{ fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>
                            {farmer.personal_info?.gender || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p style={{ fontSize: '8px', color: '#bbf7d0', fontWeight: '600', margin: '0 0 2px 0' }}>
                          PHONE
                        </p>
                        <p style={{ fontSize: '11px', margin: 0, lineHeight: '1.3' }}>
                          {farmer.personal_info?.phone_primary || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* No footer on front card */}
                </div>
              </div>

              {/* BACK SIDE */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: !showBack ? 'none' : 'block'
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  border: '4px solid white'
                }}>
                  {/* Header */}
                  <div style={{
                    background: 'linear-gradient(90deg, #15803d 0%, #16a34a 100%)',
                    padding: '8px 24px'
                  }}>
                    <p style={{ color: 'white', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
                      FARMER IDENTIFICATION CARD
                    </p>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '14px 20px', display: 'flex', gap: '20px', alignItems: 'flex-start', height: 'calc(100% - 40px)' }}>
                    {/* QR Code */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        border: '2px solid #16a34a'
                      }}>
                        {qrLoading ? (
                          <div style={{
                            width: '105px',
                            height: '105px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px'
                          }}>
                            ⏳
                          </div>
                        ) : qrCodeUrl ? (
                          <img
                            src={qrCodeUrl}
                            alt="QR Code"
                            style={{ width: '105px', height: '105px', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '105px',
                            height: '105px',
                            background: '#d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '40px'
                          }}>
                            📱
                          </div>
                        )}
                        <p style={{ textAlign: 'center', fontSize: '6px', color: '#4b5563', fontWeight: '600', margin: '6px 0 0 0' }}>
                          SCAN TO VERIFY
                        </p>
                      </div>
                    </div>

                    {/* Information */}
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'white', borderRadius: '6px', padding: '12px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', borderLeft: '3px solid #2563eb', marginBottom: '10px', minHeight: '80px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 8px 0' }}>
                          📍 Full Address
                        </h3>
                        <div style={{ fontSize: '9px', color: '#374151', lineHeight: '1.6' }}>
                          <p style={{ margin: '3px 0' }}>
                            <strong>Village:</strong> {farmer.address?.village || "N/A"}
                          </p>
                          <p style={{ margin: '3px 0' }}>
                            <strong>Chiefdom:</strong> {farmer.address?.chiefdom_name || "N/A"}
                          </p>
                          <p style={{ margin: '3px 0' }}>
                            {farmer.address?.district_name || "N/A"}, {farmer.address?.province_name || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div style={{ background: '#eff6ff', borderRadius: '6px', padding: '12px', border: '1px solid #bfdbfe', minHeight: '60px' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 8px 0' }}>
                          👤 Operator Details
                        </h3>
                        <div style={{ fontSize: '9px', color: '#374151', lineHeight: '1.6' }}>
                          <p style={{ margin: '3px 0' }}>
                            <strong>Created by:</strong> {farmer.created_by || "N/A"}
                          </p>
                          <p style={{ margin: '3px 0', fontSize: '8px', color: '#6b7280' }}>
                            MWasree Enterprises Ltd, Zambia
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => setShowBack(!showBack)}
            style={{
              background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)';
            }}
          >
            <span>🔄</span>
            {showBack ? "Show Front" : "Show Back"}
          </button>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
          <p style={{ margin: 0 }}>💡 Click "Show Back" to flip the card and see QR code</p>
        </div>
      </div>
    </div>
  );
}
