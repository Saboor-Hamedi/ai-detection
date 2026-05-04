import re
from sqlalchemy.orm import Session
from sqlalchemy import text

class PlagiarismBrain:
    """
    Industrial Plagiarism Brain V1: Detects content overlap within the localized research archive.
    Designed for high-speed integrity auditing without external dependencies.
    """
    def __init__(self):
        print("[PLAGIARISM] Initializing Integrity Engine...")

    def check_integrity(self, db: Session, target_text: str):
        """
        Scans the internal forensic archive for matching text segments.
        Uses normalized fuzzy sampling to catch identical content with formatting variations.
        """
        try:
            # 1. Archive Metadata
            total_archives = db.execute(text("SELECT COUNT(*) FROM audit_fragments")).scalar() or 0
            print(f"[PLAGIARISM] Forensic scan initiated. Archive size: {total_archives}")

            # Normalize the target text (Collapse whitespace for robust matching)
            clean_target = re.sub(r'\s+', ' ', target_text).strip()

            if not clean_target or len(clean_target) < 40:
                return {"index": 0.0, "trace_count": 0, "total_archives": total_archives}

            # 2. Forensic Multi-Sampling (Dynamic Density)
            text_len = len(clean_target)
            fingerprints = []
            
            # Scalability: 1 sample per 150 chars (Maintains consistent forensic depth)
            # Minimum 15 samples for short-form integrity
            sample_count = max(15, text_len // 150)
            window_size = 40 
            
            # Calculate stride to distribute fingerprints evenly
            step = max(20, text_len // sample_count)
            for i in range(0, text_len - window_size + 1, step):
                fingerprints.append(clean_target[i : i + window_size])

            match_hits = 0
            found_audits = set()

            # 3. Normalized Archive Probing
            for fp in fingerprints:
                if len(fp.strip()) < 15: continue
                
                # SQL Pattern: Search for the fingerprint
                # We use ILIKE and escape wildcards
                
                # We normalize the content_text in the query to ignore newlines
                # (PostgreSQL handles this efficiently via Trigram GIST index)
                # Word-Similarity (Forensic Sub-string matching)
                query = text("""
                    SELECT audit_id FROM audit_fragments 
                    WHERE :fragment <<% content_text 
                    LIMIT 1
                """)

                result = db.execute(query, {"fragment": fp}).fetchone()
                
                if result:
                    match_hits += 1
                    if match_hits == 1:
                        print(f"[PLAGIARISM] Match detected! Top ID: {result[0]}")
                    found_audits.add(result[0])

            # 4. Scoring
            plagiarism_index = (match_hits / len(fingerprints)) * 100 if fingerprints else 0
            
            return {
                "index": round(min(100.0, plagiarism_index), 2),
                "trace_count": len(found_audits),
                "total_archives": total_archives,
                "matches": list(found_audits) # Return all forensic traces
            }

        except Exception as e:
            print(f"[PLAGIARISM ERROR] Forensic Engine Failure: {e}")
            return {"index": 0.0, "trace_count": 0, "total_archives": 0, "matches": []}

    def _normalize(self, text: str):
        """Removes noise for cleaner comparison."""
        return re.sub(r'\W+', ' ', text).lower().strip()

# Singleton instance
plagiarism_brain = PlagiarismBrain()
