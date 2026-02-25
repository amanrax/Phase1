/**
 * PhoneInput
 *
 * Country-code selector + local number input.
 * Defaults to Zambia (+260).
 * Reports the full E.164-style number via `onChange(fullNumber)`.
 */
import React, { useEffect, useState } from "react";

interface CountryOption {
  code: string;   // e.g. "+260"
  iso: string;    // e.g. "ZM"
  flag: string;   // emoji
  name: string;
  maxDigits: number; // expected local digits (without leading 0)
}

const COUNTRIES: CountryOption[] = [
  { code: "+260", iso: "ZM", flag: "🇿🇲", name: "Zambia",            maxDigits: 9 },
  { code: "+263", iso: "ZW", flag: "🇿🇼", name: "Zimbabwe",          maxDigits: 9 },
  { code: "+265", iso: "MW", flag: "🇲🇼", name: "Malawi",            maxDigits: 9 },
  { code: "+255", iso: "TZ", flag: "🇹🇿", name: "Tanzania",          maxDigits: 9 },
  { code: "+254", iso: "KE", flag: "🇰🇪", name: "Kenya",             maxDigits: 9 },
  { code: "+256", iso: "UG", flag: "🇺🇬", name: "Uganda",            maxDigits: 9 },
  { code: "+234", iso: "NG", flag: "🇳🇬", name: "Nigeria",           maxDigits: 10 },
  { code: "+27",  iso: "ZA", flag: "🇿🇦", name: "South Africa",      maxDigits: 9 },
  { code: "+243", iso: "CD", flag: "🇨🇩", name: "DR Congo",          maxDigits: 9 },
  { code: "+244", iso: "AO", flag: "🇦🇴", name: "Angola",            maxDigits: 9 },
  { code: "+258", iso: "MZ", flag: "🇲🇿", name: "Mozambique",        maxDigits: 9 },
  { code: "+264", iso: "NA", flag: "🇳🇦", name: "Namibia",           maxDigits: 9 },
  { code: "+44",  iso: "GB", flag: "🇬🇧", name: "United Kingdom",    maxDigits: 10 },
  { code: "+1",   iso: "US", flag: "🇺🇸", name: "United States",     maxDigits: 10 },
  { code: "+91",  iso: "IN", flag: "🇮🇳", name: "India",             maxDigits: 10 },
];

/** Split a stored full number like "+260971234567" into countryCode + local */
function splitNumber(full: string, countries: CountryOption[]): { countryCode: string; local: string } {
  if (!full) return { countryCode: "+260", local: "" };
  const trimmed = full.replace(/\s/g, "");
  // Sort by longest prefix first so "+260" beats "+26"
  const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (trimmed.startsWith(c.code)) {
      return { countryCode: c.code, local: trimmed.slice(c.code.length) };
    }
  }
  // No match – keep raw, default country
  return { countryCode: "+260", local: trimmed };
}

interface Props {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const PhoneInput: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  required = false,
}) => {
  const [countryCode, setCountryCode] = useState("+260");
  const [localNumber, setLocalNumber] = useState("");

  // Initialise / sync from the parent `value` prop
  useEffect(() => {
    const { countryCode: cc, local } = splitNumber(value, COUNTRIES);
    setCountryCode(cc);
    setLocalNumber(local);
  }, [value]);

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    onChange(localNumber ? `${newCode}${localNumber}` : "");
  };

  const handleLocalChange = (input: string) => {
    // Strip non-digits and leading zeros
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    setLocalNumber(digits);
    onChange(digits ? `${countryCode}${digits}` : "");
  };

  return (
    <div className={`flex gap-0 mt-1 ${className}`}>
      {/* Country code selector */}
      <select
        value={countryCode}
        onChange={(e) => handleCountryChange(e.target.value)}
        disabled={disabled}
        className="flex-shrink-0 p-3 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
        style={{ minWidth: "6.5rem" }}
        title="Select country code"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>

      {/* Local number input */}
      <input
        type="tel"
        inputMode="numeric"
        value={localNumber}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder ?? `e.g. 97${" "}1234567`}
        disabled={disabled}
        required={required}
        maxLength={selectedCountry.maxDigits + 2} // a bit of slack
        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

export default PhoneInput;
