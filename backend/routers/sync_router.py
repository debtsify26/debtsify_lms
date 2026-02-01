from fastapi import APIRouter, HTTPException, status, Depends
import gspread
from google.oauth2.service_account import Credentials
import json
from supabase import Client
from database import get_supabase_admin
from auth import get_current_user_id
from config import settings
from typing import Dict, Any

router = APIRouter(prefix="/sync", tags=["Sync"])

def get_gspread_client():
    if not settings.google_sheets_credentials_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Sheets credentials not configured"
        )
    
    try:
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        # Check if it's a JSON string or a file path
        if settings.google_sheets_credentials_json.startswith('{'):
            creds_json = json.loads(settings.google_sheets_credentials_json)
            creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
        else:
            creds = Credentials.from_service_account_file(settings.google_sheets_credentials_json, scopes=scopes)
        
        return gspread.authorize(creds)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to authorize Google Sheets: {str(e)}"
        )

@router.post("")
async def sync_data(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Sync all user data to Google Sheets"""
    try:
        client = get_gspread_client()
        
        # Open or create spreadsheet
        if settings.google_spreadsheet_id:
            spreadsheet = client.open_by_key(settings.google_spreadsheet_id)
        else:
            spreadsheet = client.create(f"Debtsify_Sync_{user_id}")
            # You might want to share this with the user's email if possible
            # spreadsheet.share('user@email.com', perm_type='user', role='writer')
        
        # 1. Sync Loans
        loans_response = db.table("loans").select("*").eq("user_id", user_id).execute()
        sync_to_sheet(spreadsheet, "Loans", loans_response.data)
        
        # 2. Sync Installments
        installments_response = db.table("installments").select("*").eq("user_id", user_id).execute()
        sync_to_sheet(spreadsheet, "Installments", installments_response.data)
        
        # 3. Sync Transactions
        transactions_response = db.table("transactions").select("*").eq("user_id", user_id).execute()
        sync_to_sheet(spreadsheet, "Transactions", transactions_response.data)
        
        return {
            "message": "Data synced successfully",
            "spreadsheet_id": spreadsheet.id,
            "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{spreadsheet.id}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )

def sync_to_sheet(spreadsheet, sheet_name: str, data: list):
    try:
        try:
            worksheet = spreadsheet.worksheet(sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            # Create sheet with blue header if new
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows="100", cols="20")
        
        worksheet.clear()
        
        if not data:
            worksheet.update('A1', [['No data available']])
            return

        # Prepare headers and rows
        headers = list(data[0].keys())
        rows = [headers]
        for item in data:
            # Format dates and numbers nicely for Excel/Sheets
            row = []
            for h in headers:
                val = item.get(h, "")
                if val is None:
                    row.append("")
                else:
                    row.append(str(val))
            rows.append(row)
        
        # Batch update for performance
        worksheet.update('A1', rows)
        
        # Format headers (bold and colored)
        worksheet.format('A1:Z1', {
            "backgroundColor": {"red": 0.0, "green": 0.4, "blue": 0.8},
            "textFormat": {"color": {"red": 1.0, "green": 1.0, "blue": 1.0}, "bold": True}
        })
        
    except Exception as e:
        print(f"Failed to sync {sheet_name}: {str(e)}")
        # Don't re-raise, allow other sheets to sync
