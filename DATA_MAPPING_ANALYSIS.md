# Data Mapping Analysis: Farmer Registration vs Display

## Issue Summary
The CreateFarmer form collects data in a **legacy flat structure**, but the backend expects a **nested structured format**. The FarmerDetails view tries to display nested fields that may not exist.

---

## 1. CreateFarmer Form - Data Collected (Legacy Format)

```typescript
{
  // Personal
  farmer_name: string,           // ❌ Should be first_name + last_name
  nrc_no: string,                // ❌ Should be personal_info.nrc
  phone: string,                 // ❌ Should be personal_info.phone_primary
  email: string,                 // ✓ Maps to personal_info.email
  gender: string,                // ✓ Maps to personal_info.gender
  date_of_birth: string,         // ✓ Maps to personal_info.date_of_birth

  // Location
  province: string,              // ❌ Should be address.province_name
  province_code: string,         // ✓ Maps to address.province_code
  district: string,              // ❌ Should be address.district_name
  district_code: string,         // ✓ Maps to address.district_code
  chiefdom: string,              // ❌ Should be address.chiefdom_name
  chiefdom_code: string,         // ✓ Maps to address.chiefdom_code
  locality: string,              // ❌ Should be address.village
  zone_no: string,               // ❌ Not in backend model
  zone_name: string,             // ❌ Not in backend model

  // Farm
  total_land_holding: number,    // ❌ Should be farm_info.farm_size_hectares
  crops: Crop[],                 // ❌ Should be farm_info.crops_grown (string array)
  
  // Membership (Legacy fields not in backend model)
  has_qr: boolean,               // ❌ Not in FarmerCreate
  member_fee_paid: boolean,      // ❌ Not in FarmerCreate
  member_fee_type: string,       // ❌ Not in FarmerCreate
  active_member: boolean,        // ❌ Not in FarmerCreate
  agri_input_fee_paid: boolean,  // ❌ Not in FarmerCreate
  agri_input_fee_amount: number, // ❌ Not in FarmerCreate
  agri_input_season: string,     // ❌ Not in FarmerCreate
  distribution_model: string,    // ❌ Not in FarmerCreate
  status: string                 // ❌ Not in FarmerCreate
}
```

---

## 2. Backend Expected Format (FarmerCreate Model)

```python
{
  "personal_info": {
    "first_name": str,           # Required
    "last_name": str,            # Required
    "phone_primary": str,        # Required (+260 format)
    "phone_secondary": str?,     # Optional
    "email": str?,               # Optional
    "nrc": str,                  # Required (######/##/#)
    "date_of_birth": str,        # Required (YYYY-MM-DD)
    "gender": str,               # Required (Male|Female|Other)
    "ethnic_group": str?         # Optional
  },
  "address": {
    "province_code": str,        # Required
    "province_name": str,        # Required
    "district_code": str,        # Required
    "district_name": str,        # Required
    "chiefdom_code": str?,       # Optional
    "chiefdom_name": str?,       # Optional
    "village": str,              # Required
    "street": str?,              # Optional
    "gps_latitude": float?,      # Optional
    "gps_longitude": float?      # Optional
  },
  "farm_info": {                 # Optional object
    "farm_size_hectares": float, # Required if farm_info provided
    "crops_grown": [str],        # Array of crop names
    "livestock_types": [str],    # Array of livestock types
    "has_irrigation": bool,      # Default: false
    "years_farming": int         # Required if farm_info provided
  },
  "household_info": {            # Optional object
    "household_size": int,       # Required if household_info provided
    "number_of_dependents": int, # Required if household_info provided
    "primary_income_source": str # Required if household_info provided
  }
}
```

---

## 3. FarmerDetails View - Data Displayed

```typescript
// Personal Info
✓ personal_info.first_name
✓ personal_info.last_name
✓ personal_info.phone_primary
✓ personal_info.email
✓ personal_info.date_of_birth
✓ personal_info.gender
✓ personal_info.nrc
✓ registration_status

// Address
✓ address.province_name (fallback: address.province)
✓ address.district_name (fallback: address.district)
✓ address.village
✓ address.chiefdom_name (fallback: address.chiefdom)

// Farm Info
✓ farm_info.farm_size_hectares
✓ farm_info.crops_grown (array -> joined string)
✓ farm_info.livestock_types (fallback: livestock)
✓ farm_info.has_irrigation
✓ farm_info.farming_experience_years (fallback: years_farming)

// Documents
✓ photo_path / documents.photo
✓ identification_documents[] (nrc, land_title, license, certificate)

// Review
✓ review_notes
✓ reviewed_by
✓ reviewed_at
```

---

## 4. Database Reality (What's Actually Stored)

Based on `check_farmer_data.py` output:

```json
{
  "_id": "...",
  "farmer_id": "ZM38228A63",
  "registration_status": "registered",
  "created_at": "2025-11-24...",
  "personal_info": {
    "first_name": "Aman",
    "last_name": "Farmer",
    "phone_primary": "+260457896325",
    "email": "demo@example.com",
    "nrc": "123456/12/1",
    "date_of_birth": "2002-07-29",
    "gender": "Male",
    "ethnic_group": "Lozi"
  },
  "address": { ... },
  "farm_info": { ... },
  "household_info": { ... },
  "documents": { ... },
  "is_active": true,
  "created_by": "operator_id",
  "nrc_hash": "...",
  "photo": "...",
  "identification_documents": [...]
}
```

---

## 5. Problems Identified

### Problem 1: CreateFarmer Form Structure Mismatch
**Issue:** The form sends a flat legacy structure that doesn't match backend FarmerCreate model.

**Impact:** 
- Backend receives wrong field names
- Validation fails or data is lost
- Farmers created via this form have incomplete data

**Solution:** Rewrite CreateFarmer.tsx to match the backend structure with nested objects.

---

### Problem 2: Missing Fields in Display
**Issue:** FarmerDetails tries to display farm_info fields, but if CreateFarmer doesn't send them properly, they won't exist.

**Impact:**
- Many "N/A" values shown
- User sees incomplete farmer profiles
- Data appears "less" than what was entered

**Solution:** Fix CreateFarmer to properly map all fields to nested structure.

---

### Problem 3: Unused Legacy Fields
**Issue:** CreateFarmer collects fields not in backend model:
- `zone_no`, `zone_name`
- `has_qr`, `member_fee_paid`, `member_fee_type`
- `active_member`, `agri_input_fee_paid`
- `agri_input_fee_amount`, `agri_input_season`
- `distribution_model`, `status`

**Impact:**
- Form collects data that's never saved
- User expects features that don't exist
- Confusing UX

**Solution:** Either:
1. Remove these fields from the form, OR
2. Add them to the backend model if they're needed

---

## 6. Recommended Actions

### Priority 1: Fix CreateFarmer Data Mapping (HIGH)
Transform the form submission to match backend structure:

```typescript
// Before submit():
const backendPayload = {
  personal_info: {
    first_name: form.farmer_name.split(' ')[0],
    last_name: form.farmer_name.split(' ').slice(1).join(' '),
    phone_primary: form.phone,
    email: form.email,
    nrc: form.nrc_no,
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    ethnic_group: ""
  },
  address: {
    province_code: form.province_code,
    province_name: form.province,
    district_code: form.district_code,
    district_name: form.district,
    chiefdom_code: form.chiefdom_code || "",
    chiefdom_name: form.chiefdom || "",
    village: form.locality
  },
  farm_info: {
    farm_size_hectares: form.total_land_holding,
    crops_grown: form.crops.map(c => c.product).filter(Boolean),
    livestock_types: [],
    has_irrigation: false,
    years_farming: 0
  }
};
```

### Priority 2: Add Missing Farm Fields (MEDIUM)
Update CreateFarmer form to collect:
- Livestock types
- Years farming experience
- Irrigation status
- Household size
- Number of dependents
- Primary income source

### Priority 3: Remove Unused Fields (LOW)
Remove legacy membership fields or add backend support for:
- Zone information
- Member fee tracking
- Agricultural input fee tracking
- Distribution model

---

## 7. Quick Fix for Testing

Add a transformation function in CreateFarmer.tsx before the API call:

```typescript
const transformToBackendFormat = (form: FormData) => {
  const [firstName, ...lastNameParts] = form.farmer_name.trim().split(' ');
  
  return {
    personal_info: {
      first_name: firstName || "Unknown",
      last_name: lastNameParts.join(' ') || "User",
      phone_primary: form.phone,
      email: form.email || null,
      nrc: form.nrc_no,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      ethnic_group: null
    },
    address: {
      province_code: form.province_code,
      province_name: form.province,
      district_code: form.district_code,
      district_name: form.district,
      chiefdom_code: form.chiefdom_code || "",
      chiefdom_name: form.chiefdom || "",
      village: form.locality
    },
    farm_info: form.total_land_holding > 0 ? {
      farm_size_hectares: form.total_land_holding,
      crops_grown: form.crops.map(c => c.product).filter(Boolean),
      livestock_types: [],
      has_irrigation: false,
      years_farming: 5  // Default value
    } : null,
    household_info: null
  };
};
```

Then in submit():
```typescript
const backendPayload = transformToBackendFormat(form);
const resp = await fetch("/api/farmers/", {
  method: "POST",
  headers: { 
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`, 
    "Content-Type": "application/json" 
  },
  body: JSON.stringify(backendPayload),  // ← Use transformed data
});
```
