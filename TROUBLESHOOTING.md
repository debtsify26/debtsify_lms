# Frontend Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check if the Dev Server is Running

Open http://localhost:3000 in your browser. You should see the Debtsify application.

### 2. Check Browser Console for Errors

1. Press F12 or Ctrl+Shift+I to open Developer Tools
2. Click on the "Console" tab
3. Look for any red error messages
4. Common errors to look for:
   - "Failed to fetch" or network errors
   - "Module not found" errors
   - Type errors or undefined errors

### 3. Common Issues and Solutions

#### Issue: Blank White Screen

**Possible Causes:**
- JavaScript error preventing React from rendering
- Missing environment variables
- Module loading issues

**Solutions:**
1. Check browser console for errors
2. Verify `.env.local` exists with `GEMINI_API_KEY`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try in incognito/private mode

#### Issue: "API Key is missing" in AI Analyst

**Solution:**
1. Ensure `.env.local` file exists in `d:\debtsify\debtsify`
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Restart the dev server:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

#### Issue: Modules Not Loading (ERR_MODULE_NOT_FOUND)

**Solution:**
The app uses import maps in `index.html`. If you see module errors:
1. Check your internet connection (modules load from CDN)
2. Check if `index.html` has the import map section
3. Try clearing browser cache

#### Issue: Tailwind CSS Not Working (No Styling)

**Solution:**
Check if `index.html` includes the Tailwind CDN:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

#### Issue: Port 3000 Already in Use

**Solution:**
```powershell
# Find the process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -Property State, OwningProcess
# Stop it or use a different port in vite.config.ts
```

### 4. Verify Application State

#### Check if Data is Persisted
1. Open DevTools (F12)
2. Go to Application > Local Storage > http://localhost:3000
3. Look for keys starting with `debtsify_`
4. If you want to start fresh, right-click and "Clear All"

### 5. Network Issues

#### If AI Analyst Doesn't Respond
1. F12 > Network tab
2. Try asking the AI a question
3. Look for requests to `generativelanguage.googleapis.com`
4. If you see 401/403 errors: Invalid API key
5. If you see 429 errors: Rate limit exceeded
6. If no requests appear: Check if API key is set

### 6. React DevTools (Optional)

Install React DevTools extension for Chrome/Edge to inspect:
- Component state
- Props being passed
- Context values

## Testing Checklist

- [ ] Dev server is running on http://localhost:3000
- [ ] Page loads without blank screen
- [ ] No errors in browser console
- [ ] Navigation works (Dashboard, Loans, Schedule, Ledger, AI Analyst)
- [ ] Can create a new loan
- [ ] Can add a transaction
- [ ] AI Analyst responds (if API key configured)
- [ ] Mobile menu works (resize browser to mobile view)

## Still Having Issues?

If the problem persists, provide:
1. **Browser**: Which browser and version?
2. **Console Errors**: Copy exact error messages from console
3. **Network Errors**: Any failed requests in Network tab?
4. **Screenshots**: What you see vs what you expect
