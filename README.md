<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Debtsify - Loan Management Application

A professional single-page React web application for managing small-scale loan businesses. Built with TypeScript, React, and powered by Google's Gemini AI for financial insights.

View your app in AI Studio: https://ai.studio/apps/drive/1bkHlWVDh6LzsAdSLQ3BHOb-8Jh04FlgV

## Features

- **Dashboard**: Comprehensive KPI cards with real-time metrics
- **Loan Management**: Support for two interest models (Total Rate & Daily Rate)
- **Installment Tracking**: Schedule management with payment recording and penalties
- **Transaction Ledger**: Manual entry and CSV import/export
- **AI Financial Analyst**: Powered by Google Gemini for business insights
- **Responsive Design**: Desktop sidebar navigation, mobile bottom navigation
- **Data Persistence**: Local storage with import/export capabilities

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom React components with Lucide icons
- **Charts**: Recharts for data visualization
- **AI Integration**: Google Gemini API (@google/genai)
- **Styling**: Custom CSS (Fintech aesthetic)

## Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Gemini API Key** (Get it from [Google AI Studio](https://aistudio.google.com/apikey))

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory (already created for you) and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Important**: Replace `your_actual_gemini_api_key_here` with your actual API key from Google AI Studio.

### 3. Run the Application

Start the development server:

```bash
npm run dev
```

The application will start on **http://localhost:3000**

### 4. Access the Application

Open your browser and navigate to:
- **Local**: http://localhost:3000
- **Network**: http://0.0.0.0:3000 (accessible from other devices on your network)

## Application Architecture

### Frontend Only (Current Setup)

Currently, the application is a **frontend-only** application that uses:
- **LocalStorage** for data persistence (loans, installments, transactions)
- **Gemini API** for AI-powered financial analysis
- **Client-side routing** and state management

### Data Flow

```
User Input → React Components → LocalStorage (Data Persistence)
                               ↓
User Queries → Gemini Service → Gemini API → AI Insights
```

## Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Key Features Explained

### 1. **Dashboard**
- View total loans, active loans, collected amounts
- Real-time cash in hand calculations
- Visual charts for loan distribution and collection trends

### 2. **Loan Calculator**
- **Total Rate Model**: Fixed interest on principal
- **Daily Rate Model**: Interest calculated per day based on outstanding balance

### 3. **Installment Management**
- Track payment schedules
- Record payments with penalty calculations
- Mark installments as paid/overdue

### 4. **AI Financial Analyst**
- Ask questions about your business
- Get insights on profitability, risk, and cash flow
- Powered by Google Gemini API

### 5. **Transaction Ledger**
- Manual transaction entry (Credit/Debit)
- CSV import/export for batch operations
- Complete transaction history

## Troubleshooting

### Issue: "API Key is missing" error

**Solution**: Ensure you've created `.env.local` and added your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key
```

### Issue: Port 3000 already in use

**Solution**: Either:
1. Stop the process using port 3000
2. Or modify `vite.config.ts` to use a different port

### Issue: Dependencies not installing

**Solution**: 
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: AI Analyst not working

**Solution**: 
1. Verify your Gemini API key is valid
2. Check browser console for error messages
3. Ensure you have internet connectivity

## Data Storage

All data is stored in browser **localStorage** under the key `debtsify-data`. This includes:
- Loans
- Installments
- Transactions
- Application settings

**Note**: Data persists only in the browser. Clear browser data will reset the application.

## Future Enhancements

Based on previous conversations, planned enhancements include:
- Python backend integration with FastAPI
- Supabase database for data persistence
- User authentication
- Automated monthly backups to Google Drive
- Multi-user support

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the [Vite documentation](https://vitejs.dev/)
3. Check [Gemini API documentation](https://ai.google.dev/docs)

## License

This project is configured for personal/commercial use.
