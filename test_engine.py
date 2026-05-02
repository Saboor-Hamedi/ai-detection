import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_forensics(text):
    print(f"\n[ANALYZING] {text[:50]}...")
    
    # 1. Test Detection
    detect_res = requests.post(f"{BASE_URL}/detect", json={"text": text})
    print("\n--- FORENSIC DETECTION ---")
    print(json.dumps(detect_res.json(), indent=2))
    
    # 2. Test Rigor
    rigor_res = requests.post(f"{BASE_URL}/rigor", json={"text": text})
    print("\n--- SCHOLARLY RIGOR ---")
    print(json.dumps(rigor_res.json(), indent=2))

if __name__ == "__main__":
    # Sample human-like text with high burstiness
    human_sample = (
        "The sun dipped below the horizon. It was a long day, and the work was hard, "
        "but the satisfaction of completion made every moment worth it. "
        "Why do we strive for excellence? Perhaps it is in our nature."
    )
    
    test_forensics(human_sample)
