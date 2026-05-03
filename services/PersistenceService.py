import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

class PersistenceService:
    """
    Industrial Persistence Service: Manages the lifecycle of forensic audits in PostgreSQL.
    Ensures that research data is permanent, searchable, and secure.
    """
    @staticmethod
    def save_audit(db: Session, user_id: str, text_content: str, result: dict):
        """
        Archives a forensic session.
        """
        try:
            # 1. Register Document Metadata
            doc_id = str(uuid.uuid4())
            db.execute(
                text("INSERT INTO documents (id, user_id, filename, file_type) VALUES (:id, :u_id, :name, :type)"),
                {
                    "id": doc_id, 
                    "u_id": user_id, 
                    "name": f"Audit_{doc_id[:8]}", 
                    "type": "text"
                }
            )

            # 2. Record Forensic Metrics
            audit_id = str(uuid.uuid4())
            db.execute(
                text("""
                    INSERT INTO audits (id, document_id, ai_probability, perplexity, burstiness, entropy, classification_verdict, metrics, radar_data) 
                    VALUES (:a_id, :d_id, :prob, :ppl, :burst, :ent, :verdict, :metrics, :radar)
                """),
                {
                    "a_id": audit_id,
                    "d_id": doc_id,
                    "prob": result['ai_probability'],
                    "ppl": result['perplexity'],
                    "burst": result['burstiness'],
                    "ent": result['metrics']['entropy'],
                    "verdict": result['classification'],
                    "metrics": json.dumps(result['metrics']),
                    "radar": json.dumps(result['radar'])
                }
            )

            # 3. Store Text Content (Fragmented for high-fidelity retrieval)
            # We store the first 5000 chars as the primary searchable content in fragments
            db.execute(
                text("INSERT INTO audit_fragments (audit_id, content_text, ai_score) VALUES (:a_id, :txt, :score)"),
                {
                    "a_id": audit_id, 
                    "txt": text_content, 
                    "score": result['ai_probability']
                }
            )

            db.commit()
            return audit_id
        except Exception as e:
            db.rollback()
            print(f"[PERSISTENCE ERROR] Failed to archive audit: {e}")
            return None

    @staticmethod
    def get_history(db: Session, user_id: str):
        """
        Retrieves the forensic history for the authenticated researcher.
        """
        try:
            query = text("""
                SELECT 
                    a.id, 
                    a.ai_probability, 
                    a.classification_verdict as classification, 
                    a.created_at, 
                    f.content_text as full_text,
                    a.metrics,
                    a.radar_data as radar,
                    a.perplexity,
                    a.burstiness
                FROM audits a
                JOIN documents d ON a.document_id = d.id
                JOIN audit_fragments f ON a.id = f.audit_id
                WHERE d.user_id = :u_id
                ORDER BY a.created_at DESC
                LIMIT 50
            """)
            result = db.execute(query, {"u_id": user_id}).fetchall()
            
            history = []
            for row in result:
                history.append({
                    "id": str(row.id),
                    "ai_probability": row.ai_probability,
                    "classification": row.classification,
                    "date": row.created_at.strftime("%Y-%m-%d %H:%M"),
                    "snippet": row.full_text[:100] + "...",
                    "full_text": row.full_text,
                    "metrics": json.loads(row.metrics) if isinstance(row.metrics, str) else row.metrics,
                    "radar": json.loads(row.radar) if isinstance(row.radar, str) else row.radar,
                    "perplexity": row.perplexity,
                    "burstiness": row.burstiness
                })
            return history
        except Exception as e:
            print(f"[PERSISTENCE ERROR] Failed to fetch history: {e}")
            return []

    @staticmethod
    def purge_history(db: Session, user_id: str):
        """Removes all archived audits for a specific user."""
        try:
            db.execute(
                text("DELETE FROM documents WHERE user_id = :u_id"),
                {"u_id": user_id}
            )
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            return False

    @staticmethod
    def delete_audit(db: Session, user_id: str, audit_id: str):
        """Removes a single specific audit and its associated document."""
        try:
            # We delete the document, which cascades to audits and fragments
            db.execute(
                text("""
                    DELETE FROM documents 
                    WHERE id = (SELECT document_id FROM audits WHERE id = :a_id)
                    AND user_id = :u_id
                """),
                {"a_id": audit_id, "u_id": user_id}
            )
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            return False

persistence_service = PersistenceService()
