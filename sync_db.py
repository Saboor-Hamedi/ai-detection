import os
from sqlalchemy import text
from services.database import engine, SessionLocal
from dotenv import load_dotenv

# Load ENV from root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def sync_database():
    """
    Industrial Sync: Reads table.sql and executes it against the PostgreSQL instance.
    """
    print("[SYSTEM] INITIALIZING FORENSIC DATABASE SYNC...")
    
    sql_path = os.path.join(BASE_DIR, "table.sql")
    if not os.path.exists(sql_path):
        print(f"[ERROR] table.sql not found at {sql_path}")
        return

    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_commands = f.read()

        # Split into individual commands (crude but effective for schema creation)
        # We use a session to execute the raw SQL
        with engine.connect() as connection:
            with connection.begin():
                # Filter out empty commands
                commands = [c.strip() for c in sql_commands.split(';') if c.strip()]
                for command in commands:
                    print(f"[EXEC] Running command: {command[:50]}...")
                    connection.execute(text(command))
        
        print("[SUCCESS] FORENSIC DATABASE STRUCTURE INITIALIZED.")
    except Exception as e:
        print(f"[FATAL ERROR] Sync failed: {e}")

if __name__ == "__main__":
    sync_database()
