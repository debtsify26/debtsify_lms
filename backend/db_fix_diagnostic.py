from supabase import create_client, Client
import os
from config import settings

def check_and_fix_db():
    print("Initializing Supabase Admin Client...")
    try:
        url = settings.supabase_url
        key = settings.supabase_service_key
        supabase = create_client(url, key)
        
        # We can't run raw SQL directly via the client easily unless we use RPC.
        # But we can check the table definition by trying to post a dummy 'Dynamic' frequency.
        print("Note: Automated DB schema changes via REST client are not supported.")
        print("The 500 error is likely due to 'loans_frequency_check' in Postgres.")
        print("\nPlease run this SQL in your Supabase Dashboard -> SQL Editor:")
        print("-" * 50)
        print("ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_frequency_check;")
        print("-" * 50)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_and_fix_db()
