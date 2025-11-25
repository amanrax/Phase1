// src/pages/FarmerRegistrationWizard/Step1Personal.tsx
import { useState } from "react";

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
};

export default function Step1Personal({ data, onNext }: Props) {
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
      <h3>Personal Information</h3>
      {err && (
        <div
          role="alert"
          style={{ background: "#fee", color: "#900", padding: 10, borderRadius: 6 }}
        >
          {err}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <label htmlFor="firstName" style={{ fontWeight: "bold" }}>
          First name *
        </label>
        <input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          aria-required="true"
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="lastName" style={{ fontWeight: "bold" }}>
          Last name *
        </label>
        <input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          aria-required="true"
        />
      </div>
            <div style={{ marginTop: 12 }}>
        <label htmlFor="phone" style={{ fontWeight: "bold" }}>
          Primary Phone * <span style={{ fontWeight: "normal", fontSize: "0.85em", color: "#666" }}>(+260 or 0 + 9 digits)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="0977000000 or +260977000000"
          pattern="(\+260|0)[0-9]{9}"
          title="Phone must be +260XXXXXXXXX or 0XXXXXXXXX"
          required
          aria-required="true"
        />
      </div>

            <div style={{ marginTop: 12 }}>
        <label htmlFor="phoneSecondary" style={{ fontWeight: "bold" }}>
          Secondary Phone
        </label>
        <input
          id="phoneSecondary"
          type="tel"
          value={phoneSecondary}
          onChange={(e) => setPhoneSecondary(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="0966000000 (optional)"
          pattern="(\+260|0)[0-9]{9}"
          title="Phone must be +260XXXXXXXXX or 0XXXXXXXXX"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="email" style={{ fontWeight: "bold" }}>
          Email
        </label>
        <input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="farmer@example.com"
          type="email"
        />
      </div>

            <div style={{ marginTop: 12 }}>
        <label htmlFor="nrc" style={{ fontWeight: "bold" }}>
          NRC Number * <span style={{ fontWeight: "normal", fontSize: "0.85em", color: "#666" }}>(format: 123456/12/1)</span>
        </label>
        <input
          id="nrc"
          value={nrc}
          onChange={(e) => setNrc(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="123456/12/1"
          pattern="\d{6}/\d{2}/\d"
          title="NRC must be in format: 123456/12/1"
          required
          aria-required="true"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="dob" style={{ fontWeight: "bold" }}>
          Date of Birth *
        </label>
        <input
          id="dob"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          type="date"
          aria-required="true"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="gender" style={{ fontWeight: "bold" }}>
          Gender *
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          aria-required="true"
        >
          <option value="">-- select gender --</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="ethnicGroup" style={{ fontWeight: "bold" }}>
          Ethnic Group
        </label>
        <select
          id="ethnicGroup"
          value={ethnicGroup}
          onChange={(e) => setEthnicGroup(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        >
          <option value="">-- select ethnic group (optional) --</option>
          <option value="Bemba">Bemba</option>
          <option value="Tonga">Tonga</option>
          <option value="Chewa">Chewa</option>
          <option value="Lozi">Lozi</option>
          <option value="Nsenga">Nsenga</option>
          <option value="Tumbuka">Tumbuka</option>
          <option value="Ngoni">Ngoni</option>
          <option value="Lala">Lala</option>
          <option value="Kaonde">Kaonde</option>
          <option value="Lunda">Lunda</option>
          <option value="Luvale">Luvale</option>
          <option value="Mambwe">Mambwe</option>
          <option value="Namwanga">Namwanga</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNext}
          style={{ padding: 12, background: "#16A34A", color: "white", border: "none", borderRadius: 6 }}
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
