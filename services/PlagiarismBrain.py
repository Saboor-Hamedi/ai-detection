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

            # Normalize the target text (Collapse whitespace for robust matching)
            clean_target = re.sub(r'\s+', ' ', target_text).strip()

            if not clean_target or len(clean_target) < 40:
                return {"index": 0.0, "trace_count": 0, "total_archives": total_archives}

            # 2. Fuzzy Multi-Sampling
            text_len = len(clean_target)
            fingerprints = []
            sample_count = 15 # Optimized density
            window_size = 40 # Smaller windows = higher sensitivity
            
            step = max(15, text_len // sample_count)
            for i in range(0, text_len - window_size + 1, step):
                fingerprints.append(clean_target[i : i + window_size])

            match_hits = 0
            found_audits = set()

            # 3. Normalized Archive Probing
            for fp in fingerprints:
                if len(fp.strip()) < 15: continue
                
                # SQL Pattern: Search for the fingerprint
                # We use ILIKE and escape wildcards
                safe_fp = fp.replace("%", "\\%").replace("_", "\\_")
                
                # We normalize the content_text in the query to ignore newlines
                # (PostgreSQL REPLACE handles this efficiently)
                query = text("""
                    SELECT audit_id FROM audit_fragments 
                    WHERE REPLACE(REPLACE(content_text, CHR(10), ' '), CHR(13), ' ') ILIKE :pattern 
                    LIMIT 1
                """)
                result = db.execute(query, {"pattern": f"%{safe_fp}%"}).fetchone()
                
                if result:
                    match_hits += 1
                    found_audits.add(result[0])

            # 4. Scoring
            plagiarism_index = (match_hits / len(fingerprints)) * 100 if fingerprints else 0
            
            return {
                "index": round(min(100.0, plagiarism_index), 2),
                "trace_count": len(found_audits),
                "total_archives": total_archives,
                "top_match_id": str(list(found_audits)[0]) if found_audits else None
            }

        except Exception as e:
            print(f"[PLAGIARISM ERROR] Forensic Engine Failure: {e}")
            return {"index": 0.0, "trace_count": 0, "total_archives": 0}

    def _normalize(self, text: str):
        """Removes noise for cleaner comparison."""
        return re.sub(r'\W+', ' ', text).lower().strip()

# Singleton instance
plagiarism_brain = PlagiarismBrain()
