import gspread
from google.oauth2.service_account import Credentials
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_sync():
    creds_json_str = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
    if not creds_json_str:
        print("Error: GOOGLE_SHEETS_CREDENTIALS_JSON not found in .env")
        return

    # Strip single quotes if they were included in the env value
    if creds_json_str.startswith("'") and creds_json_str.endswith("'"):
        creds_json_str = creds_json_str[1:-1]

    try:
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds_json = json.loads(creds_json_str)
        creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
        client = gspread.authorize(creds)
        
        print("Successfully authorized with Google Sheets!")
        
        # Try to list spreadsheets
        files = client.list_spreadsheet_files()
        print(f"Found {len(files)} spreadsheets accessible by this service account.")
        for f in files[:5]:
            print(f"- {f['name']} ({f['id']})")
            
    except Exception as e:
        print(f"Connection failed: {str(e)}")

if __name__ == "__main__":
    test_sync()
