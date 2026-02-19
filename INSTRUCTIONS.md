# Critical Next Step: Run Database Migration

For the new "Per-User Sync" feature to work, you MUST add a column to your database.

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Run the following command:

```sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT;
```

Once this is done:
-   The backend will automatically start creating **NEW** individual sheets for each user when they sync.
-   The default global sheet defined in `.env` will be ignored.
-   Each user will have their own private `spreadsheet_id` stored in their user profile.
