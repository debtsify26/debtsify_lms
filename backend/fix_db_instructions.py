from database import supabase_admin
import sys

def fix_constraint():
    print("Attempting to drop 'loans_frequency_check' constraint...")
    try:
        # We can use RPC or raw SQL if supported by the client, 
        # but the supabase-py client mainly does REST.
        # However, we can use the 'rpc' method if we had a function, 
        # or just hope the user runs it.
        # Wait, the supabase-py client doesn't support raw SQL easily via the REST API.
        
        # Alternative: Instruct the user more clearly or try to use another way.
        # Actually, let's check if we can run raw SQL via postgrest. Usually no.
        
        print("Note: Raw SQL migration via Python client requires an 'exec_sql' RPC function.")
        print("Please run this in your Supabase SQL Editor:")
        print("ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_frequency_check;")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_constraint()
