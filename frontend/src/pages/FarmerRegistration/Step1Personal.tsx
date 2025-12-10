// src/pages/FarmerRegistrationWizard/Step1Personal.tsx
import { useState, useEffect } from "react";
import { ethnicGroupService, type EthnicGroup } from "@/services/ethnicGroup.service";

type PersonalData = {
  first_name?: string;
  last_name?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  nrc?: string;
  date_of_birth?: string;
  gender?: string;
  ethnic_group?: string;
};

type Props = {
  data: PersonalData;
  onNext: (values: PersonalData) => void;
  onBack?: () => void;
};

export default function Step1Personal({ data, onNext, onBack }: Props) {
  const [firstName, setFirstName] = useState(data.first_name || "");
  const [lastName, setLastName] = useState(data.last_name || "");
  const [phone, setPhone] = useState(data.phone_primary || "");
  const [phoneSecondary, setPhoneSecondary] = useState(data.phone_secondary || "");
  const [email, setEmail] = useState(data.email || "");
  const [nrc, setNrc] = useState(data.nrc || "");
  const [dob, setDob] = useState(data.date_of_birth || "");
  const [gender, setGender] = useState(data.gender || "");
  const [ethnicGroup, setEthnicGroup] = useState(data.ethnic_group || "");
  const [err, setErr] = useState("");
  
  // Ethnic groups state
  const [ethnicGroups, setEthnicGroups] = useState<EthnicGroup[]>([]);
  const [loadingEthnicGroups, setLoadingEthnicGroups] = useState(true);
  const [showCustomEthnicGroup, setShowCustomEthnicGroup] = useState(false);
  const [customEthnicGroup, setCustomEthnicGroup] = useState("");

  // Fetch ethnic groups on component mount
  useEffect(() => {
    fetchEthnicGroups();
  }, []);

  const fetchEthnicGroups = async () => {
    try {
      setLoadingEthnicGroups(true);
      const groups = await ethnicGroupService.getAll(true);
      setEthnicGroups(groups);
    } catch (error) {
      console.error("Failed to fetch ethnic groups:", error);
      setErr("Failed to load ethnic groups");
    } finally {
      setLoadingEthnicGroups(false);
    }
  };

    const handleNext = () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErr("First name, last name, and primary phone are required.");
      return;
    }
    if (!nrc.trim() || !dob.trim() || !gender.trim()) {
      setErr("NRC, Date of Birth, and Gender are required.");
      return;
    }
    
    // Validate NRC format
    const nrcPattern = /^\d{6}\/\d{2}\/\d$/;
    if (!nrcPattern.test(nrc.trim())) {
      setErr("NRC must be in format: 123456/12/1");
      return;
    }
    
    // Validate primary phone format
    const phonePattern = /^(\+260|0)[0-9]{9}$/;
    if (!phonePattern.test(phone.trim())) {
      setErr("Primary phone must be +260XXXXXXXXX or 0XXXXXXXXX");
      return;
    }
    
    // Validate secondary phone if provided
    if (phoneSecondary.trim() && !phonePattern.test(phoneSecondary.trim())) {
      setErr("Secondary phone must be +260XXXXXXXXX or 0XXXXXXXXX");
      return;
    }
    
    setErr("");
    onNext({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_primary: phone.trim(),
      phone_secondary: phoneSecondary.trim(),
      email: email.trim(),
      nrc: nrc.trim(),
      date_of_birth: dob.trim(),
      gender: gender.trim(),
      ethnic_group: ethnicGroup.trim(),
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
        👤 Personal Information
      </h3>
      {err && (
        <div
          role="alert"
          style={{ background: "#f8d7da", color: "#721c24", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #f5c6cb", fontWeight: "600" }}
        >
          ❌ {err}
        </div>
      )}
      <div style={{ marginTop: "15px" }}>
        <label htmlFor="firstName" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          First name <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
        </label>
        <input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          aria-required="true"
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="lastName" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Last name <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
        </label>
        <input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          aria-required="true"
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="phone" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Primary Phone <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span> <span style={{ fontWeight: "normal", fontSize: "0.85em", color: "#666" }}>(+260 or 0 + 9 digits)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="0977000000 or +260977000000"
          pattern="(\+260|0)[0-9]{9}"
          title="Phone must be +260XXXXXXXXX or 0XXXXXXXXX"
          required
          aria-required="true"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="phoneSecondary" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Secondary Phone
        </label>
        <input
          id="phoneSecondary"
          type="tel"
          value={phoneSecondary}
          onChange={(e) => setPhoneSecondary(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="0966000000 (optional)"
          pattern="(\+260|0)[0-9]{9}"
          title="Phone must be +260XXXXXXXXX or 0XXXXXXXXX"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="email" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Email
        </label>
        <input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="farmer@example.com"
          type="email"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="nrc" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          NRC Number <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span> <span style={{ fontWeight: "normal", fontSize: "0.85em", color: "#666" }}>(format: 123456/12/1)</span>
        </label>
        <input
          id="nrc"
          value={nrc}
          onChange={(e) => setNrc(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="123456/12/1"
          pattern="\d{6}/\d{2}/\d"
          title="NRC must be in format: 123456/12/1"
          required
          aria-required="true"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="dob" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Date of Birth <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
        </label>
        <input
          id="dob"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          type="date"
          aria-required="true"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="gender" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Gender <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          aria-required="true"
        >
          <option value="">-- select gender --</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="ethnicGroup" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Ethnic Group
        </label>
        {!showCustomEthnicGroup ? (
          <select
            id="ethnicGroup"
            value={ethnicGroup}
            onChange={(e) => {
              if (e.target.value === "OTHER") {
                setShowCustomEthnicGroup(true);
                setEthnicGroup("");
                setCustomEthnicGroup("");
              } else {
                setEthnicGroup(e.target.value);
              }
            }}
            style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
            disabled={loadingEthnicGroups}
          >
            <option value="">-- select ethnic group (optional) --</option>
            {ethnicGroups.map((group) => (
              <option key={group._id} value={group.name}>
                {group.name}
              </option>
            ))}
            <option value="OTHER">Other (specify below)</option>
          </select>
        ) : (
          <input
            id="ethnicGroup"
            type="text"
            value={customEthnicGroup}
            onChange={(e) => {
              setCustomEthnicGroup(e.target.value);
              setEthnicGroup(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Enter custom ethnic group name"
            style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          />
        )}
        {loadingEthnicGroups && (
          <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
            Loading ethnic groups...
          </small>
        )}
        {showCustomEthnicGroup && (
          <button
            type="button"
            onClick={() => {
              setShowCustomEthnicGroup(false);
              setCustomEthnicGroup("");
              setEthnicGroup("");
            }}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
            }}
          >
            Back to list
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ 
              padding: "12px 30px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#5a6268"}
            onMouseOut={(e) => e.currentTarget.style.background = "#6c757d"}
            aria-label="Go back to previous page"
          >
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNext}
          style={{ 
            padding: "12px 30px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#218838"}
          onMouseOut={(e) => e.currentTarget.style.background = "#28a745"}
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
