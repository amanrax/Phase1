// src/pages/FarmerRegistration/Step1Personal.tsx — Personal info step with PhoneInput + NRC auto-format
import { useState, useEffect } from "react";
import { ethnicGroupService, type EthnicGroup } from "@/services/ethnicGroup.service";
import { logger } from "@/utils/logger";
import PhoneInput from "@/components/PhoneInput";
import { handleNRCChange, isValidNRC } from "@/utils/nrcFormatter";
import { useFeedback } from "@/utils/feedback";

const COMPONENT = "Step1Personal";

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

const inputClass = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition placeholder:text-gray-400";
const labelClass = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5";
const requiredStar = <span className="text-red-500 font-bold">*</span>;

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
  
  const [ethnicGroups, setEthnicGroups] = useState<EthnicGroup[]>([]);
  const [loadingEthnicGroups, setLoadingEthnicGroups] = useState(true);
  const [showCustomEthnicGroup, setShowCustomEthnicGroup] = useState(false);
  const [customEthnicGroup, setCustomEthnicGroup] = useState("");

  useEffect(() => {
    fetchEthnicGroups();
  }, []);

  const fetchEthnicGroups = async () => {
    try {
      setLoadingEthnicGroups(true);
      const groups = await ethnicGroupService.getAll(true);
      setEthnicGroups(groups);
    } catch (error) {
      logger.error(COMPONENT, "fetchEthnicGroups failed", { error });
      setErr("Failed to load ethnic groups");
    } finally {
      setLoadingEthnicGroups(false);
    }
  };

  const { triggerVibration, triggerSound } = useFeedback();

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErr("First name, last name, and primary phone are required.");
      triggerVibration("form_error");
      triggerSound("error");
      return;
    }
    if (!nrc.trim() || !dob.trim() || !gender.trim()) {
      setErr("NRC, Date of Birth, and Gender are required.");
      triggerVibration("form_error");
      triggerSound("error");
      return;
    }
    if (!isValidNRC(nrc.trim())) {
      setErr("NRC must be in format: 123456/78/1");
      triggerVibration("form_error");
      triggerSound("error");
      return;
    }
    setErr("");
    logger.info(COMPONENT, "Personal info submitted");
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
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b-2 border-green-500 pb-2.5">
        👤 Personal Information
      </h3>

      {err && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm font-semibold border-l-4 border-red-500">
          ❌ {err}
        </div>
      )}

      {/* Name Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={labelClass}>First Name {requiredStar}</label>
          <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} aria-required="true" placeholder="Enter first name" />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>Last Name {requiredStar}</label>
          <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} aria-required="true" placeholder="Enter last name" />
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Primary Phone {requiredStar}</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div>
          <label className={labelClass}>Secondary Phone</label>
          <PhoneInput value={phoneSecondary} onChange={setPhoneSecondary} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="farmer@example.com" />
      </div>

      {/* NRC with auto-format */}
      <div>
        <label htmlFor="nrc" className={labelClass}>
          NRC Number {requiredStar} <span className="text-gray-400 dark:text-gray-500 font-normal text-[11px] ml-1">(auto-formats as you type)</span>
        </label>
        <input
          id="nrc"
          value={nrc}
          onChange={(e) => setNrc(handleNRCChange(e.target.value))}
          className={inputClass}
          placeholder="______/__/_"
          maxLength={11}
          aria-required="true"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Format: 123456/78/1 — just type digits, slashes are added automatically</p>
      </div>

      {/* DOB + Gender Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dob" className={labelClass}>Date of Birth {requiredStar}</label>
          <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} aria-required="true" />
        </div>
        <div>
          <label htmlFor="gender" className={labelClass}>Gender {requiredStar}</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass} aria-required="true">
            <option value="">-- select gender --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Ethnic Group */}
      <div>
        <label htmlFor="ethnicGroup" className={labelClass}>Ethnic Group</label>
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
            className={inputClass}
            disabled={loadingEthnicGroups}
          >
            <option value="">-- select ethnic group (optional) --</option>
            {ethnicGroups.map((group) => (
              <option key={group._id} value={group.name}>{group.name}</option>
            ))}
            <option value="OTHER">Other (specify below)</option>
          </select>
        ) : (
          <div className="space-y-2">
            <input
              id="ethnicGroup"
              type="text"
              value={customEthnicGroup}
              onChange={(e) => { setCustomEthnicGroup(e.target.value); setEthnicGroup(e.target.value); }}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Enter custom ethnic group name"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => { setShowCustomEthnicGroup(false); setCustomEthnicGroup(""); setEthnicGroup(""); }}
              className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              ← Back to list
            </button>
          </div>
        )}
        {loadingEthnicGroups && <p className="text-xs text-gray-400 mt-1">Loading ethnic groups...</p>}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-lg transition active:scale-95"
            aria-label="Go back to previous page"
          >
            ← Back
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition active:scale-95 shadow-sm"
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
