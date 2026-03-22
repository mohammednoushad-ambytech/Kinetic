# Kinetic — Task Management App

Angular 19 + Google Apps Script + Google Sheets

---

## What You Need From Your End

### 1. Google Account
You need a Google account. Free Gmail works fine.

### 2. Google Spreadsheet
- Create the sheet using the setup in `details/db_google_sheet/GOOGLE_SHEETS_SETUP.md`
- Note the **Spreadsheet ID** from the URL

### 3. Google Apps Script
1. In your Spreadsheet → **Extensions → Apps Script**
2. Delete default `function myFunction() {}`
3. Paste the entire contents of `details/gas/Code.gs`
4. Save (Ctrl+S)
5. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click Deploy → Copy the **Web App URL**

### 4. Put the URL in Angular
Open `src/environments/environment.ts` and replace `YOUR_SCRIPT_ID`:
```ts
gasApiUrl: 'https://script.google.com/macros/s/AKfycb.../exec'
```
Also update `src/environments/environment.prod.ts` with the same URL.

### 5. No API keys needed from Google
Apps Script Web App works without any extra API keys — it runs under your Google account.

---

## Local Setup & Run

### Prerequisites
- Node.js 18+  →  https://nodejs.org
- npm 9+

### Steps
```bash
# 1. Go to the app folder
cd D:/Projects/Kinetic/project/kinetic-app

# 2. Install dependencies
npm install

# 3. Start dev server
npm start

# 4. Open browser
# http://localhost:4200
```

### Default Login Credentials (from seed data)
| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin — full access |
| sarah.j | sarah123 | Manager |
| liam.n | liam123 | Contributor |
| james.h | james123 | Viewer (read only) |

---

## GitHub Pages Deployment

```bash
# 1. Create a GitHub repo named: kinetic-app

# 2. Push your code
git init
git add .
git commit -m "Initial Kinetic app"
git remote add origin https://github.com/YOUR_USERNAME/kinetic-app.git
git push -u origin main

# 3. Deploy to GitHub Pages
npm run deploy
```

The `deploy` script builds with the correct base href and pushes to `gh-pages` branch.

Your app will be live at: `https://YOUR_USERNAME.github.io/kinetic-app/`

---

## Testing Checklist

### Functional
- [ ] Login with admin / admin123 → lands on Dashboard
- [ ] Login with james.h / james123 (viewer) → no create/edit/delete buttons
- [ ] Login with inactive user → friendly error shown
- [ ] Wrong password → error shown
- [ ] Logout → redirected to login
- [ ] Refresh page → stays logged in (sessionStorage)
- [ ] Dashboard stats load correctly
- [ ] Projects list shows only permitted projects
- [ ] Create project → appears in list
- [ ] Edit project → changes saved
- [ ] Delete project (as admin) → removed from list
- [ ] Status = not triage → start_date becomes required
- [ ] Artifacts: add/edit/delete on a project
- [ ] Sensitive artifact shows •••• not value
- [ ] Tasks list loads correctly
- [ ] Multi-project filter works
- [ ] Overdue toggle filters overdue tasks
- [ ] Create task (status = triage) → no remarks/assignee required
- [ ] Create task (status = in_progress) → remarks and assignee required
- [ ] Edit task → saves correctly
- [ ] Delete task → removed
- [ ] Overdue tasks have red highlighting
- [ ] Mobile sidebar opens/closes

### Permissions
- [ ] james.h sees no create/edit/delete buttons
- [ ] liam.n can create and edit but not delete
- [ ] admin has all buttons
- [ ] User sees only their permitted projects/tasks

---

## Known Limitations (no-backend architecture)

1. **No password hashing** — passwords stored as plain text in Google Sheets. OK for internal use, not for public. Future: hash with SHA-256 on write.
2. **Google Apps Script rate limits** — free tier: 6 min/execution, 90 min/day. Fine for small teams.
3. **No real-time updates** — page must be refreshed or component reloaded to see other users' changes.
4. **CORS on GAS** — Apps Script doesn't set CORS headers on errors, so some error messages may show as network errors.
5. **Concurrency** — two users editing the same row simultaneously could cause overwrite. Acceptable for small teams.
6. **Session security** — sessionStorage is cleared on tab close. Use localStorage for "remember me" in future.
7. **No file uploads** — artifacts support URLs and text only, not binary files.
8. **ID generation** — IDs are user-defined for projects; tasks auto-generate. No UUID — collision possible if multiple users create simultaneously.

---

## Future Improvements

1. Password hashing (SHA-256 via Apps Script Utilities)
2. Audit log tab — auto-log every write
3. Email notifications via Gmail API in Apps Script
4. Dashboard charts using Chart.js or ApexCharts
5. Task comments sub-table
6. Drag-and-drop Kanban view
7. Export to CSV/PDF
8. Dark mode toggle
9. Admin panel for managing users and permissions from the app
10. Service Worker for offline support (PWA)
