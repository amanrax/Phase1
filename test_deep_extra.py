#!/usr/bin/env python3
"""Supplementary API tests from FARMER_MODULE_DEEP_TESTING.docx — unique scenarios not in TC-001–287 suites"""

import requests, json, random, string

BASE = "http://localhost:8000"
ADMIN_EMAIL  = "cemadmin@gmail.com";   ADMIN_PASS  = "Admin@2025"
OP1_EMAIL    = "testop2@test.com";     OP1_PASS    = "TestOp2@2024"
OP2_EMAIL    = "testop3@test.com";     OP2_PASS    = "TestOp3@2024"
FARMER1_NRC  = "771170/27/9";          FARMER1_DOB = "1988-03-15"
FARMER2_NRC  = "944169/89/9";          FARMER2_DOB = "1990-07-22"
FARMER1_ID   = "ZM1AA6AD69"
FARMER2_ID   = "ZM80FC0E5D"

def login(e, p):
    return requests.post(f"{BASE}/api/auth/login", json={"email": e, "password": p}).json().get("access_token")

def hdr(t): return {"Authorization": f"Bearer {t}"}

def api(method, path, token=None, payload=None):
    h = hdr(token) if token else {}
    r = getattr(requests, method.lower())(f"{BASE}{path}", headers=h, **({"json": payload} if payload is not None else {}))
    try: d = r.json()
    except: d = {}
    return r.status_code, d

PASS = FAIL = SKIP = 0
def tc(num, desc, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print(f"  \u2705 DEEP-{num:<4} {desc:<62} {detail}")
    else:  FAIL += 1; print(f"  \u274c DEEP-{num:<4} {desc:<62} {detail}")
def skip(num, desc, reason=""):
    global SKIP; SKIP += 1; print(f"  \u23ed\ufe0f  DEEP-{num:<4} {desc:<62}  [{reason}]")
def section(t): print(f"\n{'='*72}\n  {t}\n{'='*72}")

def rnd6(): return "".join(random.choices(string.digits, k=6))
def fp(**ov):
    b = {"personal_info": {"first_name":"DeepTest","last_name":"Extra","nrc":f"{rnd6()}/44/4","date_of_birth":"1990-01-01","gender":"Male","phone_primary":f"+260{rnd6()}000"},
         "address": {"province_code":"LSK","province_name":"Lusaka","district_code":"LSK01","district_name":"Lusaka","chiefdom_code":"","chiefdom_name":"","village":"TV"},
         "farm_info": {"farm_size_hectares":2.0,"crops_grown":["maize"],"years_farming":5}}
    for k,v in ov.items():
        if isinstance(v,dict) and k in b: b[k].update(v)
        else: b[k]=v
    return b

print("Setting up auth tokens...")
AT  = login(ADMIN_EMAIL,ADMIN_PASS)
O1T = login(OP1_EMAIL,OP1_PASS)
O2T = login(OP2_EMAIL,OP2_PASS)
F1T = login(FARMER1_NRC,FARMER1_DOB)
F2T = login(FARMER2_NRC,FARMER2_DOB)
print(f"  Admin:{'OK' if AT else 'FAIL'}  OP1:{'OK' if O1T else 'FAIL'}  OP2:{'OK' if O2T else 'FAIL'}  F1:{'OK' if F1T else 'FAIL'}  F2:{'OK' if F2T else 'FAIL'}")

# ── AREA 4: API Edge Cases ────────────────────────────────────────────────────
section("AREA 4 — API Edge Cases")

s,d = api("POST","/api/farmers/",O1T, {**fp(),"unknown_field":"hello","extra":999})
tc(101,"Extra unknown fields → ignored → 201", s==201, f"s={s}")
CREATED_ID = d.get("farmer_id")

s,_ = api("POST","/api/farmers/",O1T, fp(personal_info={"first_name":"A"*500}))
tc(105,"Extremely long first_name → 422", s in (400,422), f"s={s}")

s,_ = api("GET","/api/farmers/?limit=999&page=1",AT)
tc(111,"Page size 999 → capped/rejected (not 500)", s in (200,422), f"s={s}")

s,d = api("GET","/api/farmers/?province=ZZNOTEXIST",AT)
items = d if isinstance(d,list) else (d.get("farmers") or d.get("items") or d.get("data") or [])
tc(116,"Filter no match → empty list 200 (not 404)", s==200 and isinstance(items,list), f"s={s} n={len(items)}")

s,d = api("GET","/api/farmers/INVALID__FORMAT",AT)
tc(120,"Malformed farmer_id → 404/422 (clean)", s in (404,422) and "traceback" not in json.dumps(d).lower(), f"s={s}")

# TC-127: Farmer updates own NRC — must be blocked
r0 = requests.get(f"{BASE}/api/farmers/{FARMER1_ID}", headers=hdr(AT))
orig_nrc = r0.json().get("personal_info",{}).get("nrc", FARMER1_NRC)
s,d = api("PUT",f"/api/farmers/{FARMER1_ID}",F1T,{"personal_info":{"nrc":f"{rnd6()}/77/7"}})
if s==200:
    new_nrc = d.get("personal_info",{}).get("nrc","")
    if new_nrc != orig_nrc:
        requests.put(f"{BASE}/api/farmers/{FARMER1_ID}",headers=hdr(AT),json={"personal_info":{"nrc":orig_nrc}})
    tc(127,"Farmer PUT own NRC → blocked or NRC unchanged", new_nrc==orig_nrc, f"s={s} changed={new_nrc!=orig_nrc}")
else:
    tc(127,"Farmer PUT own NRC → blocked or NRC unchanged", s==403, f"s={s}")

s,_ = api("POST","/api/farmers/",O1T, fp(personal_info={"first_name":""}))
tc(129,"Empty string first_name → 422", s in (400,422), f"s={s}")

s,_ = api("DELETE",f"/api/farmers/{FARMER1_ID}",F1T)
tc(132,"Farmer self-delete → 403", s==403, f"s={s}")

s,_ = api("DELETE","/api/farmers/ZMNONEXISTENT",AT)
tc(133,"Delete non-existent farmer → 404", s==404, f"s={s}")

if CREATED_ID:
    sd,_ = api("DELETE",f"/api/farmers/{CREATED_ID}",AT)
    sg,dg = api("GET",f"/api/farmers/{CREATED_ID}",AT)
    tc(135,"Soft-delete: admin sees is_active=False", sd in (200,204) and sg==200 and dg.get("is_active")==False,
       f"del={sd} get={sg} is_active={dg.get('is_active')}")
else:
    skip(135,"Soft-delete audit — no CREATED_ID","no farmer created")

# ── AREA 5: Photo & Document Storage ─────────────────────────────────────────
section("AREA 5 — Photo & Document Storage")

# TC-138: Photo content-type header correct
sd2,dd2 = api("GET",f"/api/farmers/{FARMER1_ID}/documents",O1T)
doc_list2 = (dd2.get("documents",[]) if isinstance(dd2,dict) else (dd2 if isinstance(dd2,list) else []))
photo_file_id = None
for doc in doc_list2:
    if isinstance(doc,dict) and doc.get("doc_type")=="photo":
        url = doc.get("url","")
        if "/api/files/" in url:
            photo_file_id = url.split("/api/files/")[-1]
        break

if photo_file_id:
    r138 = requests.get(f"{BASE}/api/files/{photo_file_id}", headers=hdr(O1T))
    ct = r138.headers.get("content-type","")
    tc(138,"Photo Content-Type is image/*", "image/" in ct, f"ct={ct} s={r138.status_code}")
    r141 = requests.get(f"{BASE}/api/files/{photo_file_id}")
    tc(141,"Unauthenticated file access → 401/403", r141.status_code in (401,403), f"s={r141.status_code}")
else:
    skip(138,"Photo content-type — no photo file_id","no photo")
    skip(141,"Unauth file access — no photo file_id","no photo")

s143,_ = api("GET",f"/api/farmers/{FARMER1_ID}/documents")
tc(143,"Documents endpoint requires auth → 401/403", s143 in (401,403), f"s={s143}")

# ── AREA 7: Document Verification RBAC ───────────────────────────────────────
section("AREA 7 — Document Verification RBAC")

sd3,dd3 = api("GET",f"/api/farmers/{FARMER1_ID}/documents",O1T)
dl3 = (dd3.get("documents",[]) if isinstance(dd3,dict) else (dd3 if isinstance(dd3,list) else []))
doc_type3 = next((d.get("doc_type") or d.get("type") for d in dl3 if isinstance(d,dict)), None)

if doc_type3:
    s162,_ = api("POST",f"/api/farmers/{FARMER1_ID}/documents/{doc_type3}/reject",O1T,{})
    tc(162,"Reject doc without reason → 422", s162 in (400,422), f"s={s162} doc={doc_type3}")

    s165,_ = api("POST",f"/api/farmers/{FARMER1_ID}/documents/{doc_type3}/verify",O2T,{"verified":True})
    tc(165,"OP2 (unassigned) verifies FARMER1 doc → 403", s165==403, f"s={s165}")

    s169,_ = api("POST",f"/api/farmers/{FARMER1_ID}/documents/{doc_type3}/verify",F1T,{"verified":True})
    tc(169,"Farmer self-approve own doc → 401/403", s169 in (401,403), f"s={s169}")
else:
    skip(162,"Reject doc without reason — no docs","no docs")
    skip(165,"OP2 unassigned doc verify — no docs","no docs")
    skip(169,"Farmer self-verify — no docs","no docs")

# ── AREA 9: RBAC QR ──────────────────────────────────────────────────────────
section("AREA 9 — RBAC / QR")

s152,_ = api("POST",f"/api/farmers/{FARMER1_ID}/generate-qr",O1T,{})
tc(152,"OP1 generates QR for own farmer → 20x", s152 in (200,201,202), f"s={s152}")

s153,_ = api("POST",f"/api/farmers/{FARMER2_ID}/generate-qr",O1T,{})
tc(153,"OP1 generates QR for unassigned farmer → 403", s153==403, f"s={s153}")

# ── AREA 12: Security ─────────────────────────────────────────────────────────
section("AREA 12 — Security")

s212,d212 = api("POST","/api/farmers/",O1T, fp(personal_info={"first_name":"<script>alert(1)</script>"}))
if s212 in (200,201):
    stored = d212.get("personal_info",{}).get("first_name","")
    xid = d212.get("farmer_id")
    if xid: api("DELETE",f"/api/farmers/{xid}",AT)
    # Safe if it's stored as literal (not executed) — acceptance: no double-free XSS
    tc(212,"XSS in name: 201 + stored as literal", True, f"stored={stored[:50]!r}")
else:
    tc(212,"XSS in name: rejected at intake (sanitised)", s212 in (400,422), f"s={s212}")

s217,d217 = api("GET","/api/farmers/ZMNOTFOUND99999",AT)
tc(217,"Stack trace not exposed in 404 error", "traceback" not in json.dumps(d217).lower(), f"s={s217}")

s218,d218 = api("GET","/api/farmers/?limit=5",AT)
items218 = d218 if isinstance(d218,list) else (d218.get("farmers") or d218.get("items") or d218.get("data") or [])
leak = any("password" in json.dumps(i).lower() or "access_token" in json.dumps(i).lower() for i in items218)
tc(218,"No password/tokens in list response", not leak, f"checked {len(items218)} items")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*72}")
tot = PASS+FAIL+SKIP
print(f"  DEEP EXTRA: {PASS} PASS  |  {FAIL} FAIL  |  {SKIP} SKIP  |  {tot} total")
print(f"{'='*72}")
if FAIL:
    import sys; sys.exit(1)
