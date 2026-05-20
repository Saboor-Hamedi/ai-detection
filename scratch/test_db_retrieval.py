import sys
import os
from sqlalchemy import text
from fastapi.testclient import TestClient

# Include src in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database import SessionLocal
from web import app
from services.AuthService import auth_service

# Get a real user ID from the database
db = SessionLocal()
try:
    user = db.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
    if not user:
        print("ERROR: No users found in database.")
        sys.exit(1)
    user_id = str(user.id)
    print(f"Found user ID: {user_id}")
finally:
    db.close()

client = TestClient(app)

# Generate a real token
token = auth_service.create_access_token(data={"sub": user_id})

# Set the access_token cookie
client.cookies.set("access_token", token)

# Text with markdown and uneven spacing to test clean and raw alignment
test_text = (
    "AI is a **transformative technology** that leverages *proactive synergies* to deliver "
    "robust and seamless paradigm shifts.   Notably, it is pivotally shaping the landscape.  "
    "In conclusion, this highlights modern algorithms."
)

print("\n--- 1. Testing API /detect Route ---")
response = client.post("/api/v1/detect", json={"text": test_text})
print("Status Code:", response.status_code)
if response.status_code == 200:
    res_data = response.json()
    print("AI Probability:", res_data.get("ai_probability"), "%")
    print("Sentences list size:", len(res_data.get("sentences", [])))
    print("Coherency flow array:", res_data.get("coherency"))
    print("Rhythm profile array:", res_data.get("rhythm_profile"))
    print("Metrics keys:", list(res_data.get("metrics", {}).keys()))
    print("Metrics sentences size:", len(res_data["metrics"].get("sentences", [])))
    print("Metrics coherency:", res_data["metrics"].get("coherency"))
    print("Metrics rhythm_profile:", res_data["metrics"].get("rhythm_profile"))
else:
    print("Response error:", response.text)
    sys.exit(1)

print("\n--- 2. Testing API /history Route ---")
history_response = client.get("/api/v1/history")
print("Status Code:", history_response.status_code)
if history_response.status_code == 200:
    history_list = history_response.json()
    print("History items count:", len(history_list))
    if history_list:
        latest = history_list[0]
        print("Latest audit ID:", latest["id"])
        print("Latest metrics keys:", list(latest["metrics"].keys()))
        print("Latest metrics coherency:", latest["metrics"].get("coherency"))
        print("Latest metrics rhythm_profile:", latest["metrics"].get("rhythm_profile"))
else:
    print("Response error:", history_response.text)
    sys.exit(1)
