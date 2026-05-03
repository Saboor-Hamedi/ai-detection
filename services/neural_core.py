from transformers import AutoModelForCausalLM, AutoTokenizer, logging
import torch
import torch.nn.functional as F
import math
import numpy as np
import re

# Suppress internal model warnings for a cleaner industrial log
logging.set_verbosity_error()

class NeuralCore:
    """
    Industrial Neural Core V3: Handles Entropy, Perplexity, and Burstiness analysis.
    Optimized for numerical stability.
    """
    def __init__(self, model_name="gpt2"):
        print(f"[NEURAL] Initializing Forensic Core: {model_name}")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.device == "cuda":
            self.model = self.model.half()
            
        self.model.to(self.device)
        self.model.eval()
        print(f"[NEURAL] Forensic Core Ready on {self.device}")

    def calculate_metrics(self, text: str):
        """Calculates deep information density (Entropy) and Perplexity with safety caps."""
        try:
            # Clean text to prevent tokenizer anomalies
            clean_text = text.strip()
            if not clean_text or len(clean_text) < 2: return 100.0, 4.0
            
            encodings = self.tokenizer(clean_text, return_tensors="pt", truncation=True, max_length=1024)
            input_ids = encodings.input_ids.to(self.device)
            if input_ids.size(1) < 2: return 100.0, 4.0
            
            with torch.no_grad():
                outputs = self.model(input_ids, labels=input_ids)
                loss = outputs.loss.item()
                logits = outputs.logits
                
                # Entropy Calculation (Predictability)
                probs = F.softmax(logits, dim=-1)
                log_probs = F.log_softmax(logits, dim=-1)
                entropy = -(probs * log_probs).sum(dim=-1).mean().item()
            
            # NUMERICAL SAFETY: Cap loss at 20.0 to prevent math overflow (math.exp(20) is ~485M)
            perplexity = math.exp(min(loss, 20.0))
            return perplexity, entropy
            
        except Exception as e:
            print(f"[NEURAL ERROR] Stability Triggered: {e}")
            return 1000.0, 4.0

    def get_ai_score(self, ppl: float, entropy: float, burstiness: float, unique_ratio: float) -> float:
        """Fuses multiple forensic markers into a non-linear probability score."""
        try:
            # Perplexity Sigmoid
            base_score = 100 / (1 + math.exp((ppl - 110) / 12))
            
            # Entropy Penalty: Low entropy (predictable) = Machine
            entropy_penalty = max(0, (4.2 - entropy) * 15) if entropy < 4.2 else 0
            
            # Burstiness Bonus: High variance = Human
            burstiness_bonus = min(20, burstiness * 0.5)
            
            # Uniqueness Bonus: High diversity = Human
            unique_bonus = max(0, (unique_ratio - 0.4) * 30)
            
            final_score = base_score + entropy_penalty - burstiness_bonus - unique_bonus
            return round(max(1, min(99.9, final_score)), 2)
        except:
            return 50.0

    def get_burstiness(self, perplexities: list) -> float:
        """Measures variance in complexity (The Human Pulse)."""
        if len(perplexities) < 2: return 0.0
        return float(np.std(perplexities))

    def audit_fragment(self, text: str, skip_neural=False):
        """Combined audit of a specific text block."""
        clean_text = text.strip()
        if not clean_text: return 0, 100, 4.0, 0, 0
        
        ppl, entropy = self.calculate_metrics(clean_text) if not skip_neural else (100.0, 4.5)
        
        words = re.findall(r'\w+', clean_text.lower())
        unique_ratio = len(set(words)) / len(words) if words else 0.5
        
        # DNA Fragmenter logic
        ai_markers = ["furthermore", "moreover", "consequently", "notably", "essentially"]
        marker_count = sum(1 for m in ai_markers if m in clean_text.lower())
        
        prob = self.get_ai_score(ppl, entropy, 10.0, unique_ratio)
        return prob, ppl, entropy, unique_ratio, marker_count

# Singleton instance
engine = NeuralCore()
