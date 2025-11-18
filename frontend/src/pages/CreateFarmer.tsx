// src/pages/FarmerRegistration/CreateFarmer.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Crop = {
  product: string;
  area_farmed: number;
  yield_estimate: number;
  yield_actual: number;
};

type FormData = {
  farmer_name: string;
  nrc_no: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  chiefdom: string;
  district: string;
  province: string;
  zone_no: string;
  zone_name: string;
  locality: string;
  total_land_holding: number;
  crops: Crop[];
  has_qr: boolean;
  member_fee_paid: boolean;
  member_fee_type: string;
  active_member: boolean;
  agri_input_fee_paid: boolean;
  agri_input_fee_amount: number;
  agri_input_season: string;
  distribution_model: string;
  status: string;
};

const PROVINCES = [
  "Central",
  "Copperbelt",
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western",
];

const CROPS = [
  "Maize",
  "Soya Beans",
  "Groundnuts",
  "Sunflower",
  "Cotton",
  "Wheat",
  "Rice",
  "Cassava",
  "Sweet Potato",
  "Tobacco",
];

export default function CreateFarmer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBackButton] = useState(true);
  const [form, setForm] = useState<FormData>({
    farmer_name: "",
    nrc_no: "",
    phone: "",
    email: "",
    gender: "",
    date_of_birth: "",
    chiefdom: "",
    district: "",
    province: "",
    zone_no: "",
    zone_name: "",
    locality: "",
    total_land_holding: 0,
    crops: [{ product: "", area_farmed: 0, yield_estimate: 0, yield_actual: 0 }],
    has_qr: true,
    member_fee_paid: false,
    member_fee_type: "",
    active_member: true,
    agri_input_fee_paid: false,
    agri_input_fee_amount: 0,
    agri_input_season: "",
    distribution_model: "FIFO",
    status: "Active",
  });

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const updateCrop = (i: number, key: keyof Crop, value: any) => {
    const crops = [...form.crops];
    crops[i] = { ...crops[i], [key]: value };
    setForm((prev) => ({ ...prev, crops }));
  };

  const addCrop = () =>
    setForm((prev) => ({
      ...prev,
      crops: [...prev.crops, { product: "", area_farmed: 0, yield_estimate: 0, yield_actual: 0 }],
    }));

  const rmCrop = (i: number) =>
    setForm((prev) => ({
      ...prev,
      crops: prev.crops.filter((_, idx) => idx !== i),
    }));

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/farmers/", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error("Failed to create farmer");
      alert("✅ Farmer Added!");
      navigate("/farmers");
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px",
    },
    container: { maxWidth: "600px", margin: "0 auto" },
    card: {
      background: "white",
      borderRadius: "15px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
      padding: "40px",
      marginBottom: "20px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#333",
      marginBottom: "10px",
      textAlign: "center" as const,
    },
    subtitle: {
      color: "#666",
      textAlign: "center" as const,
      marginBottom: "30px",
      fontSize: "14px",
    },
    grid: { display: "grid" as const, gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" },
    fieldGroup: { marginBottom: "15px" },
    label: { display: "block", fontWeight: 600, marginBottom: "8px", color: "#333", fontSize: "14px" },
    input: { width: "100%", padding: "12px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", transition: "all 0.3s" },
    select: { width: "100%", padding: "12px", border: "2px solid #e0e0e0", borderRadius: "8px", fontSize: "14px" },
    btn: { padding: "12px 24px", borderRadius: "8px", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.3s" },
    btnPrimary: { background: "#667eea", color: "white" },
    btnSecondary: { background: "#f0f0f0", color: "#333", marginRight: "10px" },
    error: { background: "#fee", color: "#c33", padding: "12px", borderRadius: "8px", marginBottom: "15px", fontSize: "14px" },
    cropBox: { background: "#f9f9f9", padding: "15px", borderRadius: "8px", border: "2px solid #e0e0e0", marginBottom: "15px" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>🌾 Register Farmer</div>
          <div style={styles.subtitle}>Step {step} of 4</div>

          {error && <div style={styles.error}>❌ {error}</div>}

          {/* STEP 1: Personal */}
          {step === 1 && (
            <>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>👤 Name *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Full name"
                    value={form.farmer_name}
                    onChange={(e) => update("farmer_name", e.target.value)}
                    required
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🆔 NRC *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="123456/10/1"
                    value={form.nrc_no}
                    onChange={(e) => update("nrc_no", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>📱 Phone *</label>
                  <input
                    style={styles.input}
                    type="tel"
                    placeholder="+260..."
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    required
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>📧 Email</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>👫 Gender</label>
                  <select
                    style={styles.select}
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🎂 DOB</label>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🗺️ Province *</label>
                  <select
                    style={styles.select}
                    value={form.province}
                    onChange={(e) => update("province", e.target.value)}
                    required
                  >
                    <option value="">Select</option>
                    {PROVINCES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>📍 District *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="District"
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>👑 Chiefdom</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Chiefdom"
                    value={form.chiefdom}
                    onChange={(e) => update("chiefdom", e.target.value)}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🏘️ Locality *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Village"
                    value={form.locality}
                    onChange={(e) => update("locality", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>📛 Zone No</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Z001"
                    value={form.zone_no}
                    onChange={(e) => update("zone_no", e.target.value)}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🔤 Zone Name</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Zone A"
                    value={form.zone_name}
                    onChange={(e) => update("zone_name", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Farming */}
          {step === 3 && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>🌾 Land Holding (ha) *</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="2.5"
                  value={form.total_land_holding}
                  onChange={(e) =>
                    update("total_land_holding", parseFloat(e.target.value) || 0)
                  }
                  required
                />
              </div>
              <div
                style={{ marginBottom: "20px" }}
                aria-label="Crops and yields section"
              >
                <label
                  style={{ ...styles.label, marginBottom: "10px" }}
                  htmlFor="addCropButton"
                >
                  🌱 Crops & Yields
                </label>
                <button
                  id="addCropButton"
                  onClick={addCrop}
                  style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginBottom: "10px" }}
                  type="button"
                >
                  + Add Crop
                </button>
              </div>
              {form.crops.map((c, i) => (
                <div key={i} style={styles.cropBox}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <label style={{ ...styles.label, marginBottom: "5px" }} htmlFor={`cropProduct-${i}`}>
                        Crop
                      </label>
                      <select
                        id={`cropProduct-${i}`}
                        style={{ ...styles.select }}
                        value={c.product}
                        onChange={(e) => updateCrop(i, "product", e.target.value)}
                      >
                        <option value="">Select</option>
                        {CROPS.map((cr) => (
                          <option key={cr}>{cr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...styles.label, marginBottom: "5px" }} htmlFor={`cropArea-${i}`}>
                        Area (Ha)
                      </label>
                      <input
                        id={`cropArea-${i}`}
                        style={{ ...styles.input }}
                        type="number"
                        value={c.area_farmed}
                        onChange={(e) => updateCrop(i, "area_farmed", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <label style={{ ...styles.label, marginBottom: "5px" }} htmlFor={`cropYieldEst-${i}`}>
                        Est. Yield
                      </label>
                      <input
                        id={`cropYieldEst-${i}`}
                        style={{ ...styles.input }}
                        type="number"
                        value={c.yield_estimate}
                        onChange={(e) => updateCrop(i, "yield_estimate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={{ ...styles.label, marginBottom: "5px" }} htmlFor={`cropYieldAct-${i}`}>
                        Actual Yield
                      </label>
                      <input
                        id={`cropYieldAct-${i}`}
                        style={{ ...styles.input }}
                        type="number"
                        value={c.yield_actual}
                        onChange={(e) => updateCrop(i, "yield_actual", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  {form.crops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => rmCrop(i)}
                      style={{ ...styles.btn, background: "#ff6b6b", color: "white", marginTop: "10px", width: "100%" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* STEP 4: Membership */}
          {step === 4 && (
            <>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label} htmlFor="statusSelect">
                    📋 Status
                  </label>
                  <select
                    id="statusSelect"
                    style={styles.select}
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Pending</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label} htmlFor="feeTypeSelect">
                    💰 Fee Type
                  </label>
                  <select
                    id="feeTypeSelect"
                    style={styles.select}
                    value={form.member_fee_type}
                    onChange={(e) => update("member_fee_type", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Annual</option>
                    <option>Half-Yearly</option>
                  </select>
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label} htmlFor="inputFeeAmount">
                    💵 Input Fee Amount
                  </label>
                  <input
                    id="inputFeeAmount"
                    style={styles.input}
                    type="number"
                    value={form.agri_input_fee_amount}
                    onChange={(e) => update("agri_input_fee_amount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label} htmlFor="seasonInput">
                    📅 Season
                  </label>
                  <input
                    id="seasonInput"
                    style={styles.input}
                    type="text"
                    placeholder="2024/2025"
                    value={form.agri_input_season}
                    onChange={(e) => update("agri_input_season", e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="distributionModelSelect">
                  📦 Distribution
                </label>
                <select
                  id="distributionModelSelect"
                  style={styles.select}
                  value={form.distribution_model}
                  onChange={(e) => update("distribution_model", e.target.value)}
                >
                  <option>FIFO</option>
                  <option>Priority</option>
                </select>
              </div>
              <div
                style={{ display: "grid", gap: "10px" }}
                role="group"
                aria-labelledby="memberInfoHeader"
              >
                <div id="memberInfoHeader" style={{ fontWeight: 600, marginBottom: 8 }}>
                  Membership Info
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.has_qr}
                    onChange={(e) => update("has_qr", e.target.checked)}
                  />{" "}
                  QR Code Capability
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.member_fee_paid}
                    onChange={(e) => update("member_fee_paid", e.target.checked)}
                  />{" "}
                  Member Fee Paid
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.active_member}
                    onChange={(e) => update("active_member", e.target.checked)}
                  />{" "}
                  Active Member
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.agri_input_fee_paid}
                    onChange={(e) => update("agri_input_fee_paid", e.target.checked)}
                  />{" "}
                  Input Fee Paid
                </label>
              </div>
            </>
          )}

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "30px",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => (step > 1 ? setStep(step - 1) : navigate("/farmers"))}
              style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}
            >
              ← {step === 1 ? "Back" : "Previous"}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                style={{
                  ...styles.btn,
                  ...styles.btnPrimary,
                  flex: 1,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "⏳ Creating..." : "✅ Create Farmer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
