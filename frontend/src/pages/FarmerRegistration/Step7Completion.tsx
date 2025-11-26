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
        color: "#28a745",
        marginBottom: "16px"
      }}>
        Registration Complete!
      </h2>
      
      <p style={{ 
        fontSize: "18px", 
        color: "#666",
        marginBottom: "32px"
      }}>
        {farmerName} has been successfully registered
      </p>

      <div style={{
        backgroundColor: "#f8f9fa",
        padding: "24px",
        borderRadius: "12px",
        marginBottom: "32px",
        maxWidth: "500px",
        marginLeft: "auto",
        marginRight: "auto",
        border: "2px solid #667eea"
      }}>
        <p style={{ 
          fontSize: "14px", 
          color: "#666",
          marginBottom: "8px",
          fontWeight: "600"
        }}>
          Farmer ID
        </p>
        <p style={{ 
          fontSize: "28px", 
          fontWeight: "bold",
          color: "#333",
          fontFamily: "monospace",
          letterSpacing: "2px"
        }}>
          {farmerId}
        </p>
        <p style={{ 
          fontSize: "12px", 
          color: "#999",
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
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
        >
          👁️ View Farmer Details
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "14px 24px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#218838"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#28a745"}
        >
          ➕ Register Another Farmer
        </button>

        <button
          onClick={() => navigate("/farmers")}
          style={{
            padding: "14px 24px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
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
