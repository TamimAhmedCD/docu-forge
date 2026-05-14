# Grid Span System and Section/Group Creation - Implementation Summary

## Changes Implemented

### 1. Fixed Input Grid Span System (`lib/field-width.ts`)

**Problem:** Grid span system had responsive breakpoints that made the grid unstable on certain screen sizes.

**Solution:** Simplified to direct col-span values (1-6) that work reliably within a 6-column grid.

```typescript
// Before: col-span-6 sm:col-span-3 lg:col-span-1
// After: col-span-1 (direct, reliable)

const COL_SPAN_CLASSES = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
} as const
```

**Key Features:**
- All spans are clamped to 1-6 range using `clampSpan()` function
- Safe mapping - no dynamic Tailwind strings
- Added `getWidthSpan()` utility function for numeric span values
- Supports field width detection (compact, medium, large, xlarge, full)

### 2. Section/Group Creation Dialog

**Problem:** User had no choice when grouping unassigned fields - groups were automatically wrapped in sections.

**Solution:** Added a dialog that asks user whether to create just a group or wrap it in a new section.

#### New Features:

**Option 1: Group Only**
- Creates a group directly in an auto-generated container section
- Good for simple field organization

**Option 2: Section with Group**
- User provides custom section name
- Group is created inside the section
- More structured organization

#### Implementation Details:

**New Function:** `createSectionWithGroup()` in `lib/section-grouping.ts`
```typescript
export function createSectionWithGroup(
  sections: FormSection[],
  placeholderIds: string[],
  sectionName: string,
  groupName: string
): FormSection[]
```

**New Dialog:** "Organize Fields" dialog in `components/section-form.tsx`
- Shows two options for users to choose from
- Inputs section name when "Section with Group" is selected
- Cancels and resets if user closes without selecting

### 3. State Management Updates

**New State Variables:**
- `showSectionOrGroupDialog` - Controls section/group choice dialog visibility
- `pendingGroupFields` - Tracks fields waiting to be grouped
- Uses existing `newSectionName` state (reused from section creation)

**New Handlers:**
- `handleCreateGroupOnly()` - Creates just a group
- `handleCreateSectionWithGroup()` - Creates section with group inside
- Modified `handleCreateGroup()` - Shows choice dialog for unassigned fields

### 4. Grid Layout in Components

**Input Grid Pattern:**
```typescript
<div className="p-3 grid grid-cols-6 gap-3">
  {placeholders.map(placeholder => (
    <div className={getFieldWidthClasses(placeholder.width)}>
      {/* Field component */}
    </div>
  ))}
</div>
```

**Responsive Grid Notes:**
- Base grid: `grid-cols-6` (6 columns)
- Each field uses static col-span class (col-span-1 through col-span-6)
- Gap between fields: `gap-3` (0.75rem)
- All width calculations use safe span mapping

## Files Modified

1. **`lib/field-width.ts`**
   - Simplified COL_SPAN_CLASSES to direct col-span values
   - Added `getWidthSpan()` utility function
   - Improved clamping and type safety

2. **`lib/section-grouping.ts`**
   - Added `createSectionWithGroup()` function
   - Maintains all existing functionality

3. **`components/section-form.tsx`**
   - Added section/group choice dialog
   - Updated group creation flow
   - Added handlers for both creation options
   - Uses "Settings2" icon for section option, "Group" icon for group option

## User Experience Flow

### When Creating Group from Unassigned Fields:

```
User selects multiple unassigned fields
    ↓
User clicks "Create Group"
    ↓
User enters group name
    ↓
Dialog shows: "Group Only" vs "Section with Group"
    ↓
If "Group Only": Auto-generate section name, create group
    ↓
If "Section with Group": User enters custom section name, create both
    ↓
Fields organized and saved
```

### When Creating Group from Fields in Same Section:

```
User selects multiple fields in same section
    ↓
User clicks "Create Group"
    ↓
User enters group name
    ↓
Group created immediately (no dialog, since section already exists)
    ↓
Fields grouped and saved
```

## Grid Span Validation

All span values are validated through `clampSpan()`:
```typescript
export function clampSpan(span: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return Math.max(1, Math.min(6, Math.round(span))) as 1 | 2 | 3 | 4 | 5 | 6
}
```

This ensures:
- Minimum span: 1
- Maximum span: 6
- All values rounded to nearest integer
- Type-safe return type

## Testing Checklist

- [x] Build completes successfully
- [x] Grid spans 1-6 render correctly
- [x] No dynamic Tailwind strings
- [x] Field width detection works
- [x] Section/Group choice dialog appears for unassigned fields
- [x] "Group Only" option creates group with auto-named section
- [x] "Section with Group" option creates both with custom names
- [x] Grouped fields organize correctly
- [x] Dialog cancels properly
- [x] State resets after creation

## Benefits

1. **Stable Grid Layout** - Fixed span values prevent layout shifts
2. **User Control** - Users choose section vs group organization
3. **Type Safety** - Span values validated at runtime and compile time
4. **Backward Compatible** - Existing field width detection still works
5. **Clean Implementation** - Static class mapping avoids Tailwind purging issues
