from supabase import create_client, Client
from config import settings

# Initialize Supabase client
supabase: Client = create_client(
    supabase_url=settings.supabase_url,
    supabase_key=settings.supabase_key
)

# Service role client (for admin operations)
supabase_admin: Client = create_client(
    supabase_url=settings.supabase_url,
    supabase_key=settings.supabase_service_key
)


def get_supabase() -> Client:
    """Dependency to get Supabase client"""
    return supabase


def get_supabase_admin() -> Client:
    """Dependency to get Supabase admin client"""
    return supabase_admin
