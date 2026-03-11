"""Quick setup check script"""
import requests

BASE = "http://localhost:8000"

def login(email, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password}, timeout=10)
    if r.status_code == 200:
        return r.json().get("access_token")
    return None

admin_tok = login("cemadmin@gmail.com", "Admin@2025")
print("Admin login:", "OK" if admin_tok else "FAIL")

aman_tok = login("aman@gmail.com", "12345678")
print("Aman login:", "OK" if aman_tok else "FAIL")

# Decode aman token
if aman_tok:
    import base64, json
    payload = aman_tok.split(".")[1]
    payload += "=" * (4 - len(payload) % 4)
    decoded = json.loads(base64.b64decode(payload))
    print("Aman roles:", decoded.get("roles"))
    print("Aman sub:", decoded.get("sub"))

# Get all operators
if admin_tok:
    r2 = requests.get(f"{BASE}/api/operators", headers={"Authorization": f"Bearer {admin_tok}"}, timeout=10)
    d = r2.json()
    ops = d if isinstance(d, list) else d.get("operators", d.get("items", []))
    print(f"\nAll operators ({len(ops)}):")
    for o in ops:
        print(f"  {o.get('email')} | {o.get('operator_id')} | districts: {o.get('assigned_districts')} | regions: {o.get('assigned_regions')}")

# Get FARMER1
if admin_tok:
    r3 = requests.get(f"{BASE}/api/farmers/ZM1AA6AD69", headers={"Authorization": f"Bearer {admin_tok}"}, timeout=10)
    d3 = r3.json()
    print(f"\nFARMER1 (ZM1AA6AD69):")
    print(f"  operator_id: {d3.get('operator_id')}")
    print(f"  district: {d3.get('address', {}).get('district_name')}")
    print(f"  is_active: {d3.get('is_active')}")

# Get KNOWN FARMER  
farmer_tok = None
r4 = requests.post(f"{BASE}/api/auth/login", json={"nrc": "123456/12/1", "date_of_birth": "2000-02-02"}, timeout=10)
if r4.status_code == 200:
    farmer_tok = r4.json().get("access_token")
    fid = r4.json().get("farmer_id") or r4.json().get("user", {}).get("farmer_id")
    print(f"\nKnown Farmer login: OK, farmer_id={fid}")
else:
    print(f"\nKnown Farmer login: FAIL {r4.status_code} {r4.text[:100]}")
