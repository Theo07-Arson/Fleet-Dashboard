# Vehicle Route & Expenditure Tracking System

A frontend-only web application for tracking vehicle routes and expenditures. All data is stored locally in the browser using localStorage.

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
- No backend or database required
- Export/Import feature allows backup/restore of data via JSON files

