import os
import psycopg2
from dotenv import load_dotenv

# Path to .env in the root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

def expand_schema():
    print("[SYSTEM] EXPANDING LABORATORY SCHEMA...")
    
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'jan'),
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'aidetection')
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Add missing columns
        print("[EXEC] Adding columns to user_settings...")
        cur.execute("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS high_intensity BOOLEAN DEFAULT FALSE")
        cur.execute("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auto_archive BOOLEAN DEFAULT TRUE")
        
        print("[SUCCESS] user_settings table expanded with high_intensity and auto_archive columns.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FATAL] Schema update failed: {e}")

if __name__ == "__main__":
    expand_schema()
