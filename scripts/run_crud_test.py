#!/usr/bin/env python3
"""Run a safe operator -> farmer CRUD sequence against the API (CloudFront).
Prints concise JSON summaries per step and exits non-zero on failure.
"""
import json
import sys
from urllib import request, error

BASE = "http://13.204.83.198:8000/api"

def req(method, path, token=None, payload=None):
    url = BASE + path
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            try:
                js = json.loads(body)
            except Exception:
                js = body
            return resp.getcode(), js
    except error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            js = json.loads(body)
        except Exception:
            js = body
        return e.code, js
    except Exception as e:
        return 0, str(e)


def fail(msg, detail=None):
    print(json.dumps({"status": "error", "message": msg, "detail": detail}, ensure_ascii=False))
    sys.exit(1)


def main():
    # 1) Admin login
    code, body = req("POST", "/auth/login", payload={"email": "admin@ziamis.gov.zm", "password": "Admin@2024"})
    if code != 200 or not isinstance(body, dict) or "access_token" not in body:
        fail("admin auth failed", {"http": code, "body": body})
    admin_token = body["access_token"]
    print(json.dumps({"step": "admin_login", "http": code, "ok": True}))

    # 2) Create operator
    import time
    new_email = f"operator.test.{int(time.time())}@ziamis.gov.zm"
    new_pass = "TestPass123"
    op_payload = {
        "email": new_email,
        "full_name": "CI Test Operator",
        "password": new_pass,
        "phone": "+260971111111",
        "assigned_regions": ["Luapula"],
        "assigned_districts": ["Mansa District"]
    }
    code, body = req("POST", "/operators/", token=admin_token, payload=op_payload)
    if code != 201:
        fail("operator create failed", {"http": code, "body": body})
    op_id = body.get("operator", {}).get("operator_id") or body.get("operator_id")
    print(json.dumps({"step": "create_operator", "http": code, "operator_id": op_id, "email": new_email}))

    # 3) Get operator
    code, body = req("GET", f"/operators/{op_id}", token=admin_token)
    if code != 200:
        fail("get operator failed", {"http": code, "body": body})
    print(json.dumps({"step": "get_operator", "http": code, "operator_id": body.get("operator_id"), "email": body.get("email")}))

    # 4) Update operator
    upd = {"full_name": "CI Test Operator Updated", "assigned_districts": ["Mansa District", "Kawambwa District"]}
    code, body = req("PUT", f"/operators/{op_id}", token=admin_token, payload=upd)
    if code != 200:
        fail("update operator failed", {"http": code, "body": body})
    print(json.dumps({"step": "update_operator", "http": code, "operator_id": body.get("operator_id")}))

    # 5) Operator login
    code, body = req("POST", "/auth/login", payload={"email": new_email, "password": new_pass})
    if code != 200 or "access_token" not in body:
        fail("operator auth failed", {"http": code, "body": body})
    op_token = body["access_token"]
    print(json.dumps({"step": "operator_login", "http": code, "ok": True}))

    # 6) Create farmer
    f_payload = {
        "personal_info": {"first_name": "QAFirst", "last_name": "QALast", "phone_primary": "+260977000111", "nrc": "111111/11/1", "date_of_birth": "1990-01-01", "gender": "Male"},
        "address": {"province_code": "LP", "province_name": "Luapula Province", "district_code": "LP07", "district_name": "Mansa District", "chiefdom_code": "LP07-001", "chiefdom_name": "Chief Test", "village": "TestVillage"},
        "farm_info": {"farm_size_hectares": 1.5, "years_farming": 1}
    }
    code, body = req("POST", "/farmers/", token=op_token, payload=f_payload)
    if code != 201:
        fail("farmer create failed", {"http": code, "body": body})
    farmer_id = body.get("farmer_id")
    print(json.dumps({"step": "create_farmer", "http": code, "farmer_id": farmer_id}))

    # 7) Get farmer
    code, body = req("GET", f"/farmers/{farmer_id}", token=op_token)
    if code != 200:
        fail("get farmer failed", {"http": code, "body": body})
    print(json.dumps({"step": "get_farmer", "http": code, "farmer_id": body.get("farmer_id"), "first_name": body.get("personal_info", {}).get("first_name")}))

    # 8) Update farmer
    code, body = req("PUT", f"/farmers/{farmer_id}", token=op_token, payload={"personal_info": {"phone_secondary": "+260977999888"}})
    if code != 200:
        fail("update farmer failed", {"http": code, "body": body})
    print(json.dumps({"step": "update_farmer", "http": code, "farmer_id": body.get("farmer_id")}))

    # 9) Verify update
    code, body = req("GET", f"/farmers/{farmer_id}", token=op_token)
    if code != 200:
        fail("verify farmer failed", {"http": code, "body": body})
    print(json.dumps({"step": "verify_farmer", "http": code, "phone_secondary": body.get("personal_info", {}).get("phone_secondary")}))

    # 10) Cleanup: delete farmer and operator as admin
    code_f_del, body_f_del = req("DELETE", f"/farmers/{farmer_id}", token=admin_token)
    code_op_del, body_op_del = req("DELETE", f"/operators/{op_id}", token=admin_token)
    print(json.dumps({"step": "cleanup", "farmer_delete_http": code_f_del, "operator_delete_http": code_op_del}))

    print(json.dumps({"status": "done"}))


if __name__ == "__main__":
    main()
