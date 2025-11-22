
import requests
import hmac
import hashlib
import base64
import time
import os

API_URL = "http://localhost:8000/api"
SECRET = "supersecretkey_agrimanage_2025"

def login():
    """Logs in and returns the access token."""
    login_data = {
        "username": "admin@agrimanage.com",
        "password": "admin123"
    }
    response = requests.post(f"{API_URL}/auth/login", json=login_data)
    response.raise_for_status()
    return response.json()["access_token"]

def create_farmer(token):
    """Creates a farmer and returns the farmer ID."""
    headers = {"Authorization": f"Bearer {token}"}
    farmer_data = {
        "personal_info": {
            "first_name": "Test",
            "last_name": "Farmer",
            "phone_primary": "+260971234567",
            "nrc": "123456/78/9",
            "date_of_birth": "1990-01-01",
            "gender": "Male"
        },
        "address": {
            "province_code": "LP",
            "province_name": "Luapula Province",
            "district_code": "LP05",
            "district_name": "Kawambwa District",
            "village": "Test Village"
        }
    }
    response = requests.post(f"{API_URL}/farmers/", headers=headers, json=farmer_data)
    response.raise_for_status()
    return response.json()["farmer_id"]

def get_farmer(token, farmer_id):
    """Gets a farmer by ID."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_URL}/farmers/{farmer_id}", headers=headers)
    response.raise_for_status()
    return response.json()

def verify_qr_code(farmer_id):
    """Verifies a QR code and returns the response."""
    timestamp = str(int(time.time()))
    secret_key = SECRET.encode('utf-8')
    message = f"{farmer_id}|{timestamp}".encode('utf-8')
    signature = base64.urlsafe_b64encode(hmac.new(secret_key, message, hashlib.sha256).digest()).decode('utf-8')

    qr_data = {
        "farmer_id": farmer_id,
        "timestamp": timestamp,
        "signature": signature
    }
    response = requests.post(f"{API_URL}/farmers/verify-qr", json=qr_data)
    response.raise_for_status()
    return response.json()

def main():
    """Main function to run the test."""
    try:
        print("Logging in...")
        token = login()
        print("Login successful.")

        print("Creating farmer...")
        farmer_id = create_farmer(token)
        print(f"Farmer created with ID: {farmer_id}")

        print("Getting farmer details...")
        farmer = get_farmer(token, farmer_id)
        print("Farmer details retrieved successfully.")
        assert farmer["farmer_id"] == farmer_id

        print("Verifying QR code...")
        qr_response = verify_qr_code(farmer_id)
        print("QR code verified successfully.")
        assert qr_response["verified"] is True
        assert qr_response["farmer_id"] == farmer_id

        print("All tests passed!")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        if e.response:
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    main()
