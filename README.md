# Vehicle Route & Expenditure Tracking System

A frontend-only web application for tracking vehicle routes and expenditures. All data is stored locally in the browser using localStorage.

## 🎯 Key Features

- **Dashboard**: Real-time metrics (drivers, vehicles, daily/total revenue)
- **Route Management**: Add, edit, and track vehicle activities
- **Summary Reports**: Daily, weekly, and monthly analytics by driver/vehicle
- **Data Persistence**: Automatic local storage + manual JSON export
- **PDF Export**: Generate and download professional reports
- **Print & Share**: Print reports or copy to clipboard

## 📄 Data Export Options

### 1. **PDF Export** (NEW - Recommended for sharing)
- Click "Export PDF" button on any report page
- Creates a downloadable PDF file with today's date
- Perfect for printing or emailing to stakeholders
- Available on:
  - Summary Reports → Driver Summary, Vehicle Summary, Overall Summary
  - Recorded Activities table

### 2. **JSON Export** (Data Backup)
- Click "Export Data" to download a JSON file
- Contains complete database (drivers, vehicles, activities)
- Use "Import from JSON" to restore later
- Useful for backup before clearing browser data

### 3. **Print & Share**
- "Print" button opens print dialog
- "Share" button copies text to clipboard
- Native browser print features for formatting

## 🛡️ Data Loss Prevention

**localStorage automatically clears when:**
- Browser cache/history is cleared
- Cookies are deleted
- Using private/incognito mode (temporary)

**Solution: Always keep a backup!**
1. Regularly export data as JSON
2. Export important reports as PDF
3. Store copies on a USB drive or cloud storage

## Deployment on Vercel

This project is configured for static hosting on Vercel. The `vercel.json` file handles routing for the HTML pages.

### Quick Deploy

1. Push your code to GitHub
2. Import your repository in Vercel
3. **IMPORTANT:** In Vercel Dashboard → Project Settings → General → Root Directory, set it to `Grandpa`
4. Vercel will auto-detect the static site and deploy it

### File Structure

```
├── index.html      # Dashboard (main page)
├── routes.html     # Add/View Routes page
├── summary.html    # Summary Reports page
├── storage.js      # Data persistence logic
├── style.css       # Stylesheet
└── vercel.json     # Vercel configuration
```

### Local Development

Run a local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

### Troubleshooting 404 Errors

If you're getting 404 errors:

1. **Root Directory Setting (Most Common Fix):** 
   - Go to Vercel Dashboard → Your Project → Settings → General
   - Set **Root Directory** to `Grandpa` (since your files are in the `Grandpa` folder)
   - Save and redeploy
   
2. **Check file paths**: Ensure all files are in the `Grandpa` directory
3. **Verify vercel.json**: Make sure `vercel.json` is included in your deployment
4. **Check Vercel build settings**: 
   - Build Command: leave empty
   - Output Directory: leave empty (Vercel will use Root Directory)
5. **Clear browser cache**: Sometimes cached redirects can cause issues

### Notes

- All data is stored locally in the browser (localStorage)
- PDF export uses **html2pdf.js** library (loads from CDN)
- No backend or database required
- Export/Import feature allows backup/restore of data via JSON files
- Internet connection required for PDF export feature

