# Production Safety - MongoDB Data Persistence

This document explains how data persistence works and how to maintain it safely in production.

## Summary

Template settings (sections, groups, layout, placeholders) persist safely even after:
- Server crash
- Database connection reset  
- Server redeploy
- Browser refresh
- Network interruption during save

**MongoDB is the single source of truth.** The application never overwrites MongoDB with defaults.

---

## Data Flow Architecture

### Initialization (App Load)

```
Browser loads app
    ↓
useTemplates() hook mounts
    ↓
Calls store.initializeFromDatabase()
    ↓
Fetch /api/templates from MongoDB
    ↓
Store loading state = true
    ↓
MongoDB returns all templates
    ↓
Store loading state = false
    ↓
Pages render with real data
```

**Key:** If MongoDB is empty, templates array is empty. NEVER apply defaults.

### User Saves Data

```
User edits field
    ↓
User clicks Save
    ↓
Save button disables (isSaving = true)
    ↓
API request sent to /api/templates/[id]
    ↓
MongoDB updates
    ↓
API returns success
    ↓
Store updates (local memory)
    ↓
UI shows success toast
    ↓
Save button enables (isSaving = false)
```

**Key:** UI only updates AFTER database confirms success.

### Server Restart/Redeploy

```
Server crashes or redeploys
    ↓
Browser still shows cached app
    ↓
User navigates or refreshes
    ↓
useTemplates() initializes AGAIN
    ↓
Fetch /api/templates from MongoDB
    ↓
MongoDB returns saved templates
    ↓
App renders with persisted data
```

**Key:** No data loss because MongoDB is persistent.

---

## Critical Rules for Production

### 1. Show Loading State on All Pages

Every page that uses templates must show loading UI until `isLoading === false`:

```tsx
const { templates, isLoading } = useTemplates()

if (isLoading) {
  return <LoadingSpinner />
}

return <PageContent />
```

**Why:** Prevents rendering empty state and confusing the user.

### 2. Never Initialize Defaults

WRONG:
```tsx
const [data, setData] = useState(defaultData)
```

CORRECT:
```tsx
const { templates, isLoading } = useTemplates()
// templates will be whatever MongoDB has (could be empty)
```

**Why:** If you apply defaults on mount, you'll overwrite empty database on crash.

### 3. Save Only on User Action

WRONG:
```tsx
useEffect(() => {
  // Saves on every render
  saveToDB(data)
}, [data])
```

CORRECT:
```tsx
const handleSave = async () => {
  await saveToDB(data)
}
// Only called when user clicks Save
```

**Why:** Auto-saving could trigger on server restart and overwrite current state.

### 4. Wait for Database Confirmation

WRONG:
```tsx
setData(newData)
fetch('/api/save', {data}) // Fire and forget
```

CORRECT:
```tsx
try {
  await fetch('/api/save', {data})
  setData(newData) // Only update after DB confirms
} catch {
  // Keep UI in edit state, user can retry
}
```

**Why:** If save fails, you'll have inconsistent UI state.

### 5. Prevent Concurrent Saves

WRONG:
```tsx
onClick={saveToDB} // Could fire multiple times
```

CORRECT:
```tsx
const [isSaving, setIsSaving] = useState(false)

const handleSave = async () => {
  if (isSaving) return
  setIsSaving(true)
  try {
    await saveToDB()
  } finally {
    setIsSaving(false)
  }
}

// In JSX:
<button disabled={isSaving} onClick={handleSave}>
  {isSaving ? 'Saving...' : 'Save'}
</button>
```

**Why:** Multiple simultaneous saves could cause race conditions.

---

## Testing Production Safety

### Test 1: Server Crash
1. Create a template with data
2. Kill the server (`Ctrl+C`)
3. Restart the server
4. Refresh the browser
5. Data should still be there ✓

### Test 2: Database Empty
1. Empty the MongoDB collection manually
2. Restart the app
3. Templates page should show "No templates" (not crash) ✓
4. Upload a new template
5. Refresh browser
6. Template should persist ✓

### Test 3: Network Interruption
1. Edit a template
2. Click Save
3. While saving, disconnect internet (dev tools)
4. Save should fail with error toast
5. UI should remain in edit state
6. Reconnect internet
7. Click Save again
8. Save should succeed ✓

### Test 4: Concurrent Saves
1. Edit template
2. Click Save multiple times rapidly
3. Only one save request should be sent ✓
4. Save button should show "Saving..." ✓
5. Rapid clicks should be ignored ✓

---

## Files Involved

### Store & Loading
- `lib/template-store.ts` - Core data store, initializes from MongoDB
- `lib/data-loading.ts` - Utilities for data loading (documentation)
- `hooks/use-templates.ts` - React hook that exposes `isLoading` state

### Pages (All Updated)
- `app/dashboard/page.tsx` - Shows loader until isLoading = false
- `app/dashboard/templates/page.tsx` - Shows loader until isLoading = false
- `app/dashboard/templates/[id]/page.tsx` - Shows loader until isLoading = false
- `app/dashboard/generate/page.tsx` - Shows loader until isLoading = false
- `app/dashboard/upload/page.tsx` - Shows loader until isLoading = false

### API Routes (Clean)
- `app/api/templates/route.ts` - GET returns all from DB, POST adds new
- `app/api/templates/[id]/route.ts` - GET/PUT/DELETE individual template
- `app/api/section-config/route.ts` - Save/load form sections

---

## Monitoring in Production

### Watch for These Issues

1. **Data Loss After Redeploy**
   - Cause: Store has stale data
   - Solution: Ensure redeployment doesn't auto-seed
   - Check: MongoDB should have all data preserved

2. **Empty Templates After Refresh**
   - Cause: Store not loading from MongoDB
   - Solution: Check network requests - should see GET /api/templates
   - Check: isLoading should be true then false

3. **Duplicate Saves in Logs**
   - Cause: Concurrent saves happening
   - Solution: Check save button is disabled during save
   - Check: isSaving flag should prevent multiple requests

4. **Save Failures Not Showing**
   - Cause: Missing error handling
   - Solution: Check console for error messages
   - Check: Toast should show error message

---

## Deployment Checklist

Before deploying to production:

- [ ] All pages show loading UI (check `isLoading` usage)
- [ ] No seeding or default data initialization
- [ ] Save button disables during save
- [ ] Error handling shows toast on failure
- [ ] No auto-save on mount/reload
- [ ] MongoDB URI is set in environment
- [ ] Database migration runs (if needed)
- [ ] Test server restart locally
- [ ] Test browser refresh after saving
- [ ] Check console for any initialization errors

---

## Emergency Procedures

### If Data Was Lost

1. Check MongoDB backup
2. Restore backup if available
3. **Do NOT restart app** - it will re-initialize from empty DB
4. Restore manually via MongoDB Compass or CLI
5. Then restart app

### If Store Gets Out of Sync

1. User should refresh browser
2. This will trigger `initializeFromDatabase()` again
3. Store will reload from MongoDB

### If App Crashes on Startup

1. Check error logs: `console.log("[v0] ...")` messages
2. Check MongoDB connection string is valid
3. Check MongoDB is accessible
4. Restart server
5. App should load templates fresh from MongoDB

---

## Code Review Checklist

When reviewing changes:

- [ ] No seeding or default data applied to store
- [ ] All new pages that fetch templates show loading UI
- [ ] All save operations wait for DB confirmation before updating UI
- [ ] Save button/actions have loading state
- [ ] No auto-save on mount, reload, or component lifecycle
- [ ] Error handling for failed saves
- [ ] Proper error messages in console with `[v0]` prefix
