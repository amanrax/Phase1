import { useNavigate } from "react-router-dom";

type Props = {
  farmerId: string;
  farmerName: string;
};

export default function Step7Completion({ farmerId, farmerName }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ 
        fontSize: "80px", 
        marginBottom: "20px",
        animation: "bounce 1s ease-in-out"
      }}>
        ✅
      </div>
      
      <h2 style={{ 
        fontSize: "32px", 
        fontWeight: "bold", 
        color: "#16A34A",
        marginBottom: "16px"
      }}>
        Registration Complete!
      </h2>
      
      <p style={{ 
        fontSize: "18px", 
        color: "#6B7280",
        marginBottom: "32px"
      }}>
        {farmerName} has been successfully registered
      </p>

      <div style={{
        backgroundColor: "#F3F4F6",
        padding: "24px",
        borderRadius: "12px",
        marginBottom: "32px",
        maxWidth: "500px",
        marginLeft: "auto",
        marginRight: "auto"
      }}>
        <p style={{ 
          fontSize: "14px", 
          color: "#6B7280",
          marginBottom: "8px",
          fontWeight: "500"
        }}>
          Farmer ID
        </p>
        <p style={{ 
          fontSize: "28px", 
          fontWeight: "bold",
          color: "#1F2937",
          fontFamily: "monospace",
          letterSpacing: "2px"
        }}>
          {farmerId}
        </p>
        <p style={{ 
          fontSize: "12px", 
          color: "#9CA3AF",
          marginTop: "8px"
        }}>
          Save this ID for future reference
        </p>
      </div>

      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        gap: "12px",
        maxWidth: "400px",
        marginLeft: "auto",
        marginRight: "auto"
      }}>
        <button
          onClick={() => navigate(`/farmers/${farmerId}`)}
          style={{
            padding: "14px 24px",
            backgroundColor: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1D4ED8"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563EB"}
        >
          👁️ View Farmer Details
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "14px 24px",
            backgroundColor: "#16A34A",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#15803D"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#16A34A"}
        >
          ➕ Register Another Farmer
        </button>

        <button
          onClick={() => navigate("/farmers")}
          style={{
            padding: "14px 24px",
            backgroundColor: "#6B7280",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4B5563"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6B7280"}
        >
          📋 Go to Farmers List
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
