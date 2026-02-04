from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
import gspread
from google.oauth2.service_account import Credentials
import json
from supabase import Client
from database import get_supabase_admin
from auth import get_current_user_id
from config import settings
from typing import Dict, Any, List

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

def perform_sync(user_id: str, db: Client, create_monthly_archive: bool = False):
    """Actual sync logic to be run in background"""
    try:
        from datetime import datetime
        client = get_gspread_client()
        
        # Fetch all data first
        loans_response = db.table("loans").select("*").eq("user_id", user_id).execute()
        installments_response = db.table("installments").select("*").eq("user_id", user_id).execute()
        transactions_response = db.table("transactions").select("*").eq("user_id", user_id).execute()
        
        # 1. Update main live spreadsheet
        title = f"Debtsify_Sync_{user_id}"
        if settings.google_spreadsheet_id:
            spreadsheet = client.open_by_key(settings.google_spreadsheet_id)
        else:
            try:
                spreadsheet = client.open(title)
            except gspread.exceptions.SpreadsheetNotFound:
                spreadsheet = client.create(title)
        
        # Share with user's email
        try:
            user_data = db.table("users").select("email").eq("id", user_id).single().execute()
            if user_data and user_data.data and user_data.data.get("email"):
                user_email = user_data.data.get("email")
                print(f"Sharing spreadsheet with {user_email}...")
                spreadsheet.share(user_email, perm_type='user', role='writer')
        except Exception as share_error:
            print(f"Warning: Failed to share spreadsheet with user: {str(share_error)}")

        
        sync_to_sheet(spreadsheet, "Loans", loans_response.data)
        sync_to_sheet(spreadsheet, "Installments", installments_response.data)
        sync_to_sheet(spreadsheet, "Transactions", transactions_response.data)
        
        # 4. Sync Investment Breakdown
        # Calculate breakdown locally
        breakdown_data = create_investment_breakdown(loans_response.data, installments_response.data)
        
        # Save calculated breakdown to Database
        try:
           # First delete existing for this user (full refresh)
           db.table("investment_breakdown").delete().eq("user_id", user_id).execute()
           
           # Prepare data for insertion (unformatted numbers)
           db_insert_data = []
           for item in breakdown_data:
               # Parse formatted strings back to numbers/raw values
               # Note: create_investment_breakdown returns formatted strings (e.g. ₹20,000)
               # We need to extract raw values. Ideally, refactor helper to return raw data.
               # For now, we will just parse it back or use a new helper.
               
               # Actually, let's just make create_investment_breakdown return raw data + formatted
               # But to avoid breaking changes, let's just recalculate for DB insertion here quickly.
               # Or better: Extract the calculation logic. See below.
               pass

           # Redoing calculation for DB insertion clean up
           db_records = []
           for loan in loans_response.data:
                l_id = loan.get("id")
                principal = float(loan.get("principal_amount", 0))
                multiplier = float(loan.get("total_rate_multiplier") or 1.2)
                l_type = loan.get("type")
                
                # Fetch installments for this loan
                l_insts = [i for i in installments_response.data if i.get("loan_id") == l_id]
                received = sum(float(i.get("paid_amount", 0)) for i in l_insts)
                
                # Market Value Logic
                mkt_principal = 0.0
                mkt_interest = 0.0
                
                if l_type == "TOTAL_RATE":
                    total_repay = principal * multiplier
                    total_interest = total_repay - principal
                    for i in l_insts:
                        if i.get("status") != "PAID":
                            rem = float(i.get("expected_amount", 0)) - float(i.get("paid_amount", 0))
                            mkt_principal += rem * (principal / total_repay)
                            mkt_interest += rem * (total_interest / total_repay)
                    int_pct = (multiplier - 1) * 100
                else: 
                    # DAILY_RATE
                    daily_rate = float(loan.get("daily_rate_per_lakh", 0))
                    int_pct = daily_rate
                    if loan.get("status") == "ACTIVE":
                         mkt_principal = principal
                    for i in l_insts:
                        if i.get("status") != "PAID":
                             mkt_interest += (float(i.get("expected_amount", 0)) - float(i.get("paid_amount", 0)))

                db_records.append({
                    "user_id": user_id,
                    "loan_id": l_id,
                    "person": loan.get("client_name"),
                    "start_date": loan.get("start_date"),
                    "cycle": loan.get("frequency"),
                    "capital": principal,
                    "interest_percentage": int_pct,
                    "received": received,
                    "mkt_principal": mkt_principal,
                    "mkt_interest": mkt_interest,
                    "total_market_value": mkt_principal + mkt_interest
                })
           
           if db_records:
               db.table("investment_breakdown").insert(db_records).execute()
               
        except Exception as db_err:
            print(f"Warning: Failed to update investment_breakdown table: {str(db_err)}")

        # Sync to Sheets (using formatted helper)
        sync_to_sheet(spreadsheet, "Investment_Breakdown", breakdown_data)
        
        # 2. Create monthly archive if requested or if it's a new month
        current_month = datetime.now().strftime("%Y-%m")
        archive_title = f"Debtsify_Archive_{current_month}_{user_id}"
        
        if create_monthly_archive:
            try:
                # Check if this month's archive already exists
                try:
                    archive_sheet = client.open(archive_title)
                    print(f"Monthly archive for {current_month} already exists, updating...")
                except gspread.exceptions.SpreadsheetNotFound:
                    # Create new monthly archive
                    archive_sheet = client.create(archive_title)
                    print(f"Created new monthly archive: {archive_title}")
                
                # Share archive with user's email
                try:
                    user_data = db.table("users").select("email").eq("id", user_id).single().execute()
                    if user_data and user_data.data and user_data.data.get("email"):
                        user_email = user_data.data.get("email")
                        print(f"Sharing archive with {user_email}...")
                        archive_sheet.share(user_email, perm_type='user', role='writer')
                except Exception as share_error:
                    print(f"Warning: Failed to share archive with user: {str(share_error)}")
                
                # Sync data to archive
                sync_to_sheet(archive_sheet, "Loans", loans_response.data)
                sync_to_sheet(archive_sheet, "Installments", installments_response.data)
                sync_to_sheet(archive_sheet, "Transactions", transactions_response.data)
                
                # Add a summary sheet with monthly metrics
                create_monthly_summary(archive_sheet, loans_response.data, 
                                     installments_response.data, transactions_response.data)
                
            except Exception as e:
                print(f"Failed to create monthly archive: {str(e)}")
        
        print(f"Sync completed successfully for user {user_id}")
        
        # Return the spreadsheet URL
        return {
            "main_url": f"https://docs.google.com/spreadsheets/d/{spreadsheet.id}",
            "archive_url": f"https://docs.google.com/spreadsheets/d/{archive_sheet.id}" if create_monthly_archive and 'archive_sheet' in locals() else None
        }
        
    except Exception as e:
        print(f"Background sync failed for user {user_id}: {str(e)}")
        return None

@router.post("")
async def sync_data(
    background_tasks: BackgroundTasks,
    create_archive: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Sync all user data to Google Sheets in the background
    
    Args:
        create_archive: If True, also creates a monthly archive snapshot
    """
    # Start the background task
    background_tasks.add_task(perform_sync, user_id, db, create_archive)
    
    response_msg = "Sync started in background"
    spreadsheet_url = None
    
    if create_archive:
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        response_msg += f" (including monthly archive for {current_month})"
    
    if settings.google_spreadsheet_id:
        spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{settings.google_spreadsheet_id}"
        response_msg += f". You can view it here: {spreadsheet_url}"

    return {
        "message": response_msg,
        "status": "processing",
        "spreadsheet_url": spreadsheet_url
    }

def sync_to_sheet(spreadsheet, sheet_name: str, data: list):
    try:
        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            # Resize to ensure enough space (min 1000 or data length + 100)
            required_rows = max(1000, len(data) + 100)
            worksheet.resize(rows=required_rows)
        except gspread.exceptions.WorksheetNotFound:
            # Create sheet with blue header if new
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows="5000", cols="20")
        
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

def create_investment_breakdown(loans_data: list, installments_data: list):
    """Create investment breakdown with detailed analytics per loan"""
    breakdown = []
    
    for loan in loans_data:
        loan_id = loan.get("id")
        client_name = loan.get("client_name", "Unknown")
        start_date = loan.get("start_date", "")
        principal = float(loan.get("principal_amount", 0))
        loan_type = loan.get("type", "")
        frequency = loan.get("frequency", "")
        
        # Get all installments for this loan
        loan_installments = [i for i in installments_data if i.get("loan_id") == loan_id]
        
        # Calculate received amount (paid installments)
        received = sum(float(i.get("paid_amount", 0)) for i in loan_installments)
        
        # Calculate market values
        mkt_principal = 0
        mkt_interest = 0
        total_expected = 0
        
        if loan_type == "TOTAL_RATE":
            multiplier = float(loan.get("total_rate_multiplier", 1.2))
            total_repay = principal * multiplier
            total_interest = total_repay - principal
            
            # Interest percentage
            int_pct = ((multiplier - 1) * 100)
            
            for inst in loan_installments:
                if inst.get("status") != "PAID":
                    remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                    total_expected += remaining
                    # Amortize principal vs interest
                    mkt_principal += remaining * (principal / total_repay)
                    mkt_interest += remaining * (total_interest / total_repay)
        else:
            # DAILY_RATE
            daily_rate = float(loan.get("daily_rate_per_lakh", 100))
            int_pct = daily_rate  # Rate per lakh per day
            
            if loan.get("status") == "ACTIVE":
                mkt_principal = principal
            
            for inst in loan_installments:
                if inst.get("status") != "PAID":
                    remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                    total_expected += remaining
                    mkt_interest += remaining
        
        total_mkt_value = mkt_principal + mkt_interest
        
        breakdown.append({
            "Person": client_name,
            "Start Date": start_date,
            "Cycle": f"{frequency}d" if frequency.isdigit() else frequency,
            "Capital": f"₹{principal:,.0f}",
            "Int (%)": f"{int_pct:.1f}%",
            "Received": f"₹{received:,.0f}",
            "Mkt Principal": f"₹{mkt_principal:,.0f}",
            "Mkt Interest": f"₹{mkt_interest:,.0f}",
            "Total Market Value": f"₹{total_mkt_value:,.0f}"
        })
    
    return breakdown

def create_monthly_summary(spreadsheet, loans_data: list, installments_data: list, transactions_data: list):
    """Create a monthly summary sheet with key metrics"""
    try:
        from datetime import datetime
        
        # Calculate metrics
        total_disbursed = sum(float(loan.get("principal_amount", 0)) for loan in loans_data)
        
        # Total Collected (Installments only)
        total_installments_collected = sum(float(inst.get("paid_amount", 0)) for inst in installments_data)
        
        # Cash Flow Calculations (matching logic in transactions_router)
        total_txn_credit = sum(float(txn.get("amount", 0)) for txn in transactions_data if txn.get("type") == "CREDIT")
        total_txn_debit = sum(float(txn.get("amount", 0)) for txn in transactions_data if txn.get("type") == "DEBIT")
        
        # Total Inflow = Installments + Credit Txns
        total_inflow = total_installments_collected + total_txn_credit
        
        # Total Outflow = Disbursements + Debit Txns
        total_outflow = total_disbursed + total_txn_debit
        
        active_loans = len([l for l in loans_data if l.get("status") == "ACTIVE"])
        pending_installments = len([i for i in installments_data if i.get("status") == "PENDING"])
        overdue_installments = len([i for i in installments_data if i.get("status") == "OVERDUE"])
        
        # Create summary sheet
        try:
            summary_sheet = spreadsheet.worksheet("Monthly_Summary")
        except gspread.exceptions.WorksheetNotFound:
            summary_sheet = spreadsheet.add_worksheet(title="Monthly_Summary", rows="30", cols="5")
        
        summary_sheet.clear()
        
        # Build summary data
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        summary_data = [
            ["Debtsify - Monthly Financial Summary"],
            [f"Generated: {current_date}"],
            [],
            ["Metric", "Value"],
            ["Total Loans", len(loans_data)],
            ["Active Loans", active_loans],
            ["Total Disbursed", f"₹{total_disbursed:,.2f}"],
            ["Total Installments Collected", f"₹{total_installments_collected:,.2f}"],
            [],
            ["Cash Flow"],
            ["Total Inflow", f"₹{total_inflow:,.2f}"],
            ["Total Outflow", f"₹{total_outflow:,.2f}"],
            ["Net Cash Flow (Cash in Hand)", f"₹{(total_inflow - total_outflow):,.2f}"],
            [],
            ["Installment Status"],
            ["Pending", pending_installments],
            ["Overdue", overdue_installments],
        ]
        
        summary_sheet.update('A1', summary_data)
        
        # Format the summary sheet
        summary_sheet.format('A1:B1', {
            "backgroundColor": {"red": 0.0, "green": 0.3, "blue": 0.7},
            "textFormat": {"fontSize": 14, "bold": True, "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}},
            "horizontalAlignment": "CENTER"
        })
        
        summary_sheet.format('A4:B4', {
            "backgroundColor": {"red": 0.9, "green": 0.9, "blue": 0.9},
            "textFormat": {"bold": True}
        })
        
        print("Monthly summary sheet created successfully")
        
    except Exception as e:
        print(f"Failed to create monthly summary: {str(e)}")
