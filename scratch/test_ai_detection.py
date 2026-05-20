import sys
import os

# Include src in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.AIDetectionBrain import engine

ai_text = (
    "AI is a transformative technology that leverages proactive synergies to deliver robust "
    "and seamless paradigm shifts. Notably, it is important to note that neural networks "
    "are pivotally shaping the landscape. In conclusion, this highlights the calculated grace "
    "and meticulous precision of modern machine learning algorithms."
)

print("Text length:", len(ai_text))
for sentence in ai_text.split(". "):
    if not sentence.strip():
        continue
    prob, ppl, entropy, unique_ratio, marker_count = engine.audit_fragment(sentence)
    print(f"Sentence: {sentence}")
    print(f"  PPL: {ppl:.2f}")
    print(f"  Entropy: {entropy:.2f}")
    print(f"  Unique Ratio: {unique_ratio:.2f}")
    print(f"  Markers: {marker_count}")
    print(f"  AI Probability: {prob:.2f}%")
    print("-" * 40)
