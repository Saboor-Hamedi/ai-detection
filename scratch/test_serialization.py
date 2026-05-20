import sys
import os
from fastapi.encoders import jsonable_encoder

# Include src in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.forensic_router import SentenceResult

res_list = [
    SentenceResult(text="This is a test sentence.", ai_probability=85.5, perplexity=12.3)
]

data = {
    "sentences": res_list
}

serialized = jsonable_encoder(data)
print("Serialized sentences:", serialized["sentences"])
print("Type of serialized elements:", type(serialized["sentences"][0]))
print("Keys of serialized element:", serialized["sentences"][0].keys() if isinstance(serialized["sentences"][0], dict) else dir(serialized["sentences"][0]))
