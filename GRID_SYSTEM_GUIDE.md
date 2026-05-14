# Grid System Developer Guide

## Overview

The grid system uses a 6-column layout with safe, static Tailwind class mappings. All span values are clamped between 1-6 for stability and safety.

## Core Concepts

### Column Spans

| Span | Tailwind Class | Width | Use Case |
|------|---|---|---|
| 1 | `col-span-1` | 1/6 | Compact fields (phone, ID, etc.) |
| 2 | `col-span-2` | 2/6 | Medium fields (name, email) |
| 3 | `col-span-3` | 3/6 | Large fields (address start) |
| 4 | `col-span-4` | 4/6 | Extra large fields |
| 5 | `col-span-5` | 5/6 | Almost full width |
| 6 | `col-span-6` | 100% | Full width (textarea, select) |

### Field Width Types

```typescript
type FieldWidth = 'compact' | 'medium' | 'large' | 'xlarge' | 'full'

// Maps to spans:
- 'compact' → 1 (compact fields)
- 'medium' → 2 (default for most fields)
- 'large' → 3 (description, address)
- 'xlarge' → 4 (extended content)
- 'full' → 6 (textareas, full-width fields)
```

## API Reference

### `lib/field-width.ts`

#### `getFieldWidthClasses(width: FieldWidth): string`
Gets Tailwind CSS classes for a field width type.

```typescript
import { getFieldWidthClasses } from '@/lib/field-width'

// Usage
const classes = getFieldWidthClasses('medium') // Returns 'col-span-2'
```

#### `getSpanClasses(span: number): string`
Gets Tailwind CSS classes for a numeric span (1-6).

```typescript
import { getSpanClasses } from '@/lib/field-width'

// Usage
const classes = getSpanClasses(3) // Returns 'col-span-3'
const safe = getSpanClasses(10) // Returns 'col-span-6' (clamped!)
```

#### `getWidthSpan(width: FieldWidth): 1 | 2 | 3 | 4 | 5 | 6`
Gets numeric span value from a field width type.

```typescript
import { getWidthSpan } from '@/lib/field-width'

// Usage
const span = getWidthSpan('large') // Returns 3
```

#### `clampSpan(span: number): 1 | 2 | 3 | 4 | 5 | 6`
Ensures a span value is between 1-6.

```typescript
import { clampSpan } from '@/lib/field-width'

// Usage
clampSpan(0) // Returns 1
clampSpan(3) // Returns 3
clampSpan(10) // Returns 6
```

#### `detectFieldWidth(placeholder: Placeholder): FieldWidth`
Auto-detects field width based on placeholder name and type.

```typescript
const width = detectFieldWidth({
  id: 'phone',
  name: 'phone',
  label: 'Phone Number',
  type: 'text',
  // ... other properties
})
// Returns 'compact' based on keyword matching
```

## Usage Examples

### In a React Component

```tsx
import { getFieldWidthClasses, detectFieldWidth } from '@/lib/field-width'

export function FormField({ placeholder, value, onChange }) {
  const width = detectFieldWidth(placeholder)
  const spanClass = getFieldWidthClasses(width)
  
  return (
    <div className={spanClass}>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder.label}
      />
    </div>
  )
}
```

### In a Grid Container

```tsx
<div className="grid grid-cols-6 gap-3">
  {fields.map(field => (
    <FormField
      key={field.id}
      placeholder={field}
      value={formData[field.id]}
      onChange={(e) => updateField(field.id, e.target.value)}
    />
  ))}
</div>
```

### Manual Span Control

```tsx
<div className={getSpanClasses(2)}>
  {/* Field with span-2 (2 columns) */}
</div>
```

## Width Detection Keywords

### Compact Fields (span-1)
phone, mobile, tel, salary, age, year, month, day, date, dob, id, number, pin, code, zip, postal, amount, price, cost, fee, qty, quantity, count, total, score, rank, grade, level, status, gender

### Medium Fields (span-2)
name, first, last, email, designation, title, position, role, department, company, organization, city, state, country, nationality, occupation, bank, account, branch

### Large Fields (span-3)
address, street, location, description, note, comment, remark, feedback, message, bio, summary, objective, experience, education, skills, instruction, detail

### Full-Width Fields (span-6)
All `textarea` type fields automatically use `col-span-6`

## Safe Mapping Pattern

The grid system uses a static mapping to avoid Tailwind purging issues:

```typescript
// ❌ DON'T: Dynamic strings (Tailwind can't purge these)
const span = Math.random() * 6
const className = `col-span-${span}` // UNSAFE

// ✅ DO: Static mapping (Tailwind can purge safely)
const COL_SPAN_CLASSES = {
  1: 'col-span-1',
  2: 'col-span-2',
  // ... etc
}
const className = COL_SPAN_CLASSES[clampSpan(span)]
```

## Grid Responsive Behavior

The grid uses a fixed 6-column layout at all breakpoints:

```typescript
<div className="grid grid-cols-6 gap-3">
  {/* Always 6 columns */}
  {/* Fields use col-span-1 to col-span-6 to fill space */}
</div>
```

### Why Fixed?
- **Predictable layout** - No surprise reflows
- **Easier debugging** - Span value = actual width
- **Performance** - Fewer CSS rules

### Example Layout

With fields of spans [2, 2, 2]:
```
[Field 1: span-2] [Field 2: span-2] [Field 3: span-2]
```

With fields of spans [3, 3]:
```
[Field 1: span-3]          [Field 2: span-3]
```

With fields of spans [6]:
```
[Field 1: span-6 - full width]
```

## Type Safety

All functions return type-safe values:

```typescript
// These are narrowly typed
const span: 1 | 2 | 3 | 4 | 5 | 6 = clampSpan(3)
const width: FieldWidth = detectFieldWidth(placeholder)

// Accessing the mapping is always safe
const className: string = COL_SPAN_CLASSES[span] // Never undefined
```

## Common Mistakes to Avoid

### ❌ Using responsive breakpoints
```typescript
// Wrong - breaks grid layout
'col-span-6 sm:col-span-3 lg:col-span-1'
```

### ✅ Use fixed spans
```typescript
// Correct - stable layout
'col-span-1'
```

### ❌ Dynamic span calculation
```typescript
// Wrong - Tailwind can't purge these
const className = `col-span-${Math.floor(width / 20)}`
```

### ✅ Use safe mapping
```typescript
// Correct - static strings
const className = getSpanClasses(span)
```

## Testing Grid Spans

To verify grid behavior:

```typescript
import { getSpanClasses, clampSpan } from '@/lib/field-width'

// Test clamping
expect(clampSpan(-5)).toBe(1)
expect(clampSpan(3)).toBe(3)
expect(clampSpan(100)).toBe(6)

// Test class generation
expect(getSpanClasses(1)).toBe('col-span-1')
expect(getSpanClasses(6)).toBe('col-span-6')
expect(getSpanClasses(10)).toBe('col-span-6') // Clamped
```

## Performance Considerations

1. **Static Mapping** - O(1) lookup time
2. **No CSS Generation** - All classes are pre-defined in Tailwind config
3. **No Runtime Calculations** - Spans determined at component mount
4. **Tree-Shakeable** - Unused utilities are removed by Tailwind purger

## Future Enhancements

Possible improvements while maintaining stability:

1. **Responsive Grid Options** - Allow opt-in for responsive behavior with explicit breakpoint handling
2. **Custom Span Values** - Let users override span per field
3. **Span Presets** - Named presets for common layouts ("two-thirds", "sidebar", etc.)
4. **Span Calculations** - Helper functions for complex layouts

## Related Files

- `lib/field-width.ts` - Core width/span utilities
- `lib/section-grouping.ts` - Section and group management
- `components/section-form.tsx` - Form rendering with grid
- `GRID_SPAN_FIX.md` - Implementation details
