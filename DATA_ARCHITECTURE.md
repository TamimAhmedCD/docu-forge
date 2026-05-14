# Data Architecture Guide

## The Problem We Solved

Before this update, template data could be lost if:
- Server restarted
- Database temporarily disconnected
- Browser was refreshed

**The Root Cause:** The app would initialize empty store on load, potentially overwriting persisted data.

## The Solution

MongoDB is now the **single source of truth** and the app follows a strict DB-first pattern.

---

## Data Storage Layers

```
┌─────────────────────────────────┐
│   React Component State          │  (Temporary, session-only)
│   - isLoading, isSaving, etc     │
└──────────────┬──────────────────┘
               │ updates on save
               ↓
┌─────────────────────────────────┐
│   In-Memory Store               │  (Cache, resets on page refresh)
│   lib/template-store.ts         │  - getTemplates()
│   - arrays: templates, docs     │  - isStoreLoading()
└──────────────┬──────────────────┘
               │ initialized from DB
               │ updated after save
               ↓
┌─────────────────────────────────┐
│   MongoDB (Persistent)          │  (Single source of truth)
│   - collections: templates      │  - NEVER reset
│   - collections: sectionConfigs │  - Survives restarts
└─────────────────────────────────┘
```

**Key:** Data only flows DOWN (DB → Memory → UI), never UP without explicit save.

---

## Initialization Flow

### What Happens on App Load

```
1. App starts
   ↓
2. useTemplates() hook mounts
   ├─ Sets isLoading = true (from store.isStoreLoading())
   └─ Calls store.initializeFromDatabase()
   ↓
3. store.initializeFromDatabase()
   ├─ Checks if already initialized
   │  └─ If yes: return immediately
   └─ If no: proceed
   ↓
4. Fetch from /api/templates
   ├─ API queries MongoDB
   └─ MongoDB returns all templates (or empty array)
   ↓
5. Transform data (base64 decode, parse dates)
   ↓
6. Store updates:
   ├─ templates = data
   ├─ isLoading = false
   └─ notifyListeners()
   ↓
7. React components re-render
   ├─ useTemplates() hook gets new state
   ├─ isLoading is now false
   └─ Templates render (or "no templates" if empty)
```

**Critical:** If MongoDB has 0 templates, store has 0 templates. This is CORRECT.

### What Happens on Page Refresh

```
1. User refreshes browser (F5)
   ↓
2. React app remounts
   ↓
3. useTemplates() hook runs AGAIN
   ├─ Checks store.isStoreInitialized()
   │  └─ In-memory store was wiped by refresh
   └─ isStoreInitialized() returns false
   ↓
4. Calls store.initializeFromDatabase() AGAIN
   ↓
5. Fetches from /api/templates AGAIN
   ↓
6. MongoDB returns the saved templates
   ↓
7. Page renders with correct data
```

**Result:** User never sees "no data" → "has data" flash. Spinner shows the whole time.

---

## Save Flow

### How Saves Work

```
User Action (click Save button)
   ↓
handleSave() starts
   ├─ Check isSaving (prevent duplicates)
   └─ Set isSaving = true
   ↓
Disable save button (user can't click again)
   ↓
Call store.updateTemplate(id, updates)
   ├─ Send PUT /api/templates/id with new data
   └─ **WAIT** for response
   ↓
MongoDB processes update atomically
   ↓
API returns 200 OK
   ↓
store.updateTemplate() completes successfully
   ├─ Update in-memory templates array
   └─ Call notifyListeners()
   ↓
React components re-render
   ├─ Show updated data
   └─ Show success toast
   ↓
Set isSaving = false
   ↓
Enable save button
```

**Critical:** Memory updates ONLY AFTER DB confirms success.

### What if Save Fails?

```
Error occurs (network, DB down, validation error)
   ↓
API returns error response
   ↓
Promise rejects in updateTemplate()
   ↓
In-memory templates are NOT updated
   └─ In-memory state matches DB state
   ↓
Error is caught
   ├─ Show error toast
   └─ Keep isSaving = false
   ↓
Save button enables again
   ↓
UI remains in "edit mode"
   ├─ User can see their unsaved changes
   └─ User can retry save
   ↓
User clicks Save again
   └─ Retry succeeds (network restored, etc)
```

**Result:** No lost data, no confusing state, user knows what to do.

---

## State Consistency Guarantees

### Memory State ≤ Database State

The in-memory store is ALWAYS a subset or exact copy of the database.

```
Scenario: User edits, saves successfully
  Before:  DB has v1, Memory has v1
  During:  DB has v1, Memory has v1 (unchanged until confirmation)
  After:   DB has v2, Memory has v2

Scenario: User edits, save fails
  Before:  DB has v1, Memory has v1
  During:  DB has v1, Memory has v1 (unchanged)
  After:   DB has v1, Memory has v1 (consistent)

Scenario: User edits, server crashes during save
  DB receives PUT request atomically
  Either:
    - DB updates to v2, Memory is old v1
      → Next page load: fetch DB, get v2, Memory updates to v2
    - DB rejects, stays v1, Memory stays v1
      → Consistent either way
```

**Guarantee:** Memory and DB can be out of sync temporarily, but they converge on next action.

---

## Preventing Common Mistakes

### WRONG: Default on Mount
```tsx
// ❌ WRONG - overwrites DB on crash
const [templates, setTemplates] = useState([
  { id: '1', name: 'Default Template' }
])
```

**Why:** If server crashes before first DB load, this default becomes the truth.

### RIGHT: Load from Store
```tsx
// ✓ CORRECT
const { templates, isLoading } = useTemplates()
// templates is whatever MongoDB has (could be empty)
```

### WRONG: Auto-Save on Mount
```tsx
// ❌ WRONG - saves empty data on mount/refresh
useEffect(() => {
  saveToDB(data)
}, [])
```

**Why:** On page refresh, data is empty, save overwrites with empty.

### RIGHT: Save Only on User Action
```tsx
// ✓ CORRECT
const handleSave = async () => {
  await saveToDB(data)
}
// Only called when user clicks Save button
```

### WRONG: Update Before Confirmation
```tsx
// ❌ WRONG - data lost if network fails
const handleSave = () => {
  setData(newData)  // Update UI immediately
  fetch('/api/save', {data})  // Fire and forget
}
```

**Why:** If network fails, UI has new data but DB still has old.

### RIGHT: Wait for Confirmation
```tsx
// ✓ CORRECT
const handleSave = async () => {
  try {
    await fetch('/api/save', {data})  // Wait
    setData(newData)  // Update only after confirmation
  } catch {
    // Keep old data if save fails
  }
}
```

---

## Data Lifecycle Examples

### Example 1: Create Template

```
1. User selects file to upload
   ↓
2. onClick handler processes file
   ↓
3. Extract placeholders, create Template object
   ↓
4. Call store.addTemplate(template)
   ├─ Set pendingSaves.add(id)
   └─ Send POST /api/templates
   ↓
5. MongoDB inserts new document
   ↓
6. API returns 200 with template
   ↓
7. store.addTemplate completes
   ├─ Update memory: templates = [...templates, template]
   ├─ Set pendingSaves.delete(id)
   └─ notifyListeners()
   ↓
8. React re-renders
   ├─ New template appears in list
   └─ Success toast shows
```

### Example 2: Edit Template Settings

```
User is on editor page
   ↓
Page shows loading spinner (waiting for DB)
   ↓
useTemplates() loads from MongoDB
   ├─ Calls /api/templates to get all
   └─ Calls /api/templates/id to get specific one
   ↓
Memory updates with template data
   ↓
Page renders editor UI with data
   ↓
User edits field (e.g., placeholder label)
   ↓
onChange handler updates React state
   ↓
User clicks Save button
   ↓
Call store.updateTemplate(id, { placeholders: [...] })
   ├─ Send PUT /api/templates/id with new placeholders
   └─ Disable save button
   ↓
MongoDB updates document
   ↓
API returns 200
   ↓
Memory updates: templates[i].placeholders = new
   ↓
Success toast, button enables
```

### Example 3: Server Restart Recovery

```
Server is running, user has been editing template
   ↓
Server crashes (power failure, deploy, etc)
   ↓
MongoDB on separate server remains intact
   ↓
Browser shows stale UI (from before crash)
   ↓
User notices something's wrong, refreshes page (F5)
   ↓
Browser re-executes app code
   ↓
useTemplates() hook runs again
   ├─ isStoreInitialized() = false (in-memory was cleared)
   └─ Calls store.initializeFromDatabase()
   ↓
Fetch /api/templates
   ↓
Server has restarted, responds with list
   ↓
Fetch /api/templates/id
   ↓
Server responds with saved template
   ↓
Memory updates with all saved data
   ↓
Page renders with all data intact
   ↓
User continues where they left off
```

---

## Monitoring and Debugging

### Checking State Health

```javascript
// In browser console:
import * as store from '@/lib/template-store'

// Check loading state
store.isStoreLoading()  // true while initializing

// Check initialization
store.isStoreInitialized()  // true after first load

// Get current templates
store.getTemplates()  // array of templates

// Check for pending saves
store.isSavePending('template-id')  // true if saving

// Get specific template
store.getTemplate('template-id')  // template or undefined
```

### Console Logs to Watch For

```javascript
// Good signs:
"[v0] Loaded templates from MongoDB: 5"  // Initialized with 5 templates
"[v0] Loaded templates from MongoDB: 0"  // Initialized with 0 templates (OK)

// Warning signs:
"[v0] Failed to load templates: 404"      // API endpoint missing
"[v0] Failed to initialize from MongoDB"  // DB connection error
```

### Network Requests to Monitor

```
GET /api/templates
  - Called once on app init
  - Should return array of templates
  - Status: 200

PUT /api/templates/[id]
  - Called when user clicks Save
  - Body contains updated template fields
  - Status: 200 on success

GET /api/section-config?templateKey=...
  - Called when loading document generator
  - Returns saved form sections
  - Can return 404 if none saved yet (OK)
```

---

## Summary

### The Three Rules

1. **MongoDB is Truth**
   - It persists forever
   - Never reset, never seed, never default

2. **Load from DB First**
   - Every page init loads from MongoDB
   - Not from localStorage, cache, or defaults
   - Show spinner while loading

3. **Save Only on Action**
   - User click = save
   - NOT on mount, reload, or background
   - Wait for confirmation before updating UI

### The Result

Template data persists safely through:
- Server crashes ✓
- Database disconnection ✓
- Browser refresh ✓
- Network interruption ✓
- Deployment redeploy ✓
- Any other failure ✓
