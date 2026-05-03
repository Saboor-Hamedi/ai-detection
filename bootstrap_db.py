import os
import psycopg2
from dotenv import load_dotenv

# Load ENV from root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def create_database():
    """
    Industrial Bootstrapper: Creates the 'aidetection' database if it doesn't exist.
    Connects to the default 'postgres' database first.
    """
    print("[SYSTEM] BOOTSTRAPPING NEURAL DATABASE...")
    
    # Connection details to the default 'postgres' DB
    params = {
        "host": "127.0.0.1",
        "user": os.getenv('DB_USER'),
        "password": os.getenv('DB_PASSWORD'),
        "port": os.getenv('DB_PORT', '5432'),
        "dbname": "postgres" # Connect to system DB
    }

    try:
        # Connect to system DB
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cur = conn.cursor()

        # Check if DB exists
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'aidetection'")
        exists = cur.fetchone()
        
        if not exists:
            print("[EXEC] Creating database 'aidetection'...")
            cur.execute('CREATE DATABASE aidetection')
            print("[SUCCESS] Database 'aidetection' created.")
        else:
            print("[INFO] Database 'aidetection' already exists.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FATAL ERROR] Bootstrap failed: {e}")

if __name__ == "__main__":
    create_database()
