import sys
import os
from fastapi.testclient import TestClient

# Include src in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web import app
from services.AuthService import auth_service

client = TestClient(app)

# Generate a test token
test_user_id = "00000000-0000-0000-0000-000000000000"
token = auth_service.create_access_token(data={"sub": test_user_id})

# Set the access_token cookie
client.cookies.set("access_token", token)

ai_text = (
    "AI is a transformative technology that leverages proactive synergies to deliver robust "
    "and seamless paradigm shifts. Notably, it is important to note that neural networks "
    "are pivotally shaping the landscape. In conclusion, this highlights the calculated grace "
    "and meticulous precision of modern machine learning algorithms."
)

response = client.post("/api/v1/detect", json={"text": ai_text})
print("Status Code:", response.status_code)
if response.status_code == 200:
    import json
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
else:
    print("Response text:", response.text)
