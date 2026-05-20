import re
from sqlalchemy.orm import Session
from sqlalchemy import text

class PlagiarismBrain:
    """
    Industrial Plagiarism Brain V2: High-performance integrity engine.
    Uses a single batched SQL query instead of N individual round-trips.
    Scales efficiently to large documents (78k+ chars).
    """
    def __init__(self):
        print("[PLAGIARISM] Initializing Integrity Engine...")

    def check_integrity(self, db: Session, target_text: str):
        """
        Scans the internal forensic archive for matching text segments.
        V2: Single batched query — O(1) DB round-trips instead of O(N).
        """
        try:
            # 1. Archive Metadata
            total_archives = db.execute(text("SELECT COUNT(*) FROM audit_fragments")).scalar() or 0
            print(f"[PLAGIARISM] Forensic scan initiated. Archive size: {total_archives}")

            # Normalize the target text
            clean_target = re.sub(r'\s+', ' ', target_text).strip()

            if not clean_target or len(clean_target) < 40:
                return {"index": 0.0, "trace_count": 0, "total_archives": total_archives}

            if total_archives == 0:
                return {"index": 0.0, "trace_count": 0, "total_archives": 0, "matches": []}

            # 2. Smart Sampling — Hard cap at 40 fingerprints regardless of doc size
            # This keeps DB load constant even for 100k+ char documents
            text_len = len(clean_target)
            window_size = 55  # Slightly larger window = more precise matches
            MAX_FINGERPRINTS = 40
            MIN_FINGERPRINTS = 12

            # Calculate how many fingerprints to take
            sample_count = max(MIN_FINGERPRINTS, min(MAX_FINGERPRINTS, text_len // 500))
            step = max(window_size, text_len // sample_count)

            fingerprints = []
            for i in range(0, text_len - window_size + 1, step):
                fp = clean_target[i: i + window_size].strip()
                if len(fp) >= 20:
                    fingerprints.append(fp)

            if not fingerprints:
                return {"index": 0.0, "trace_count": 0, "total_archives": total_archives, "matches": []}

            print(f"[PLAGIARISM] Scanning {len(fingerprints)} fingerprints (doc: {text_len} chars)")

            # 3. SINGLE BATCHED QUERY
            # Instead of N queries, we pass all fingerprints as an array and
            # use PostgreSQL's ANY() to check all at once.
            # This reduces DB round-trips from N to 1.
            batch_query = text("""
                SELECT DISTINCT audit_id
                FROM audit_fragments
                WHERE EXISTS (
                    SELECT 1
                    FROM unnest(:fingerprints) AS fp
                    WHERE content_text ILIKE '%' || fp || '%'
                )
            """)

            results = db.execute(batch_query, {"fingerprints": fingerprints}).fetchall()
            found_audits = {row[0] for row in results}

            # 4. Scoring: check each fingerprint against the archive content (in-memory)
            # We already have matched audit IDs; now compute the hit ratio
            # by checking how many fingerprints appear in any known archive
            if found_audits:
                # Fetch the archive texts for found audits (1 query)
                archive_query = text("""
                    SELECT content_text FROM audit_fragments 
                    WHERE audit_id = ANY(:ids)
                    LIMIT 10
                """)
                archive_rows = db.execute(archive_query, {"ids": list(found_audits)}).fetchall()
                archive_texts = " ".join(r[0] for r in archive_rows if r[0]).lower()

                match_hits = sum(
                    1 for fp in fingerprints
                    if fp.lower() in archive_texts
                )
            else:
                match_hits = 0

            plagiarism_index = (match_hits / len(fingerprints)) * 100 if fingerprints else 0

            return {
                "index": round(min(100.0, plagiarism_index), 2),
                "trace_count": len(found_audits),
                "total_archives": total_archives,
                "matches": list(found_audits)
            }

        except Exception as e:
            print(f"[PLAGIARISM ERROR] Forensic Engine Failure: {e}")
            return {"index": 0.0, "trace_count": 0, "total_archives": 0, "matches": []}

    def _normalize(self, text: str):
        """Removes noise for cleaner comparison."""
        return re.sub(r'\W+', ' ', text).lower().strip()

# Singleton instance
plagiarism_brain = PlagiarismBrain()
