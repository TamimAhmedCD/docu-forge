import { Placeholder, FieldWidth, FieldType } from '@/types'

// Keywords that indicate compact width fields
const COMPACT_KEYWORDS = [
  'phone', 'mobile', 'tel', 'salary', 'wage', 'pay', 'age', 'year', 'month', 'day',
  'date', 'dob', 'birth', 'id', 'number', 'no', 'pin', 'code', 'zip', 'postal',
  'amount', 'price', 'cost', 'fee', 'rate', 'percent', 'percentage', 'qty', 'quantity',
  'count', 'total', 'score', 'rank', 'grade', 'level', 'status', 'gender', 'sex',
]

// Keywords that indicate medium width fields
const MEDIUM_KEYWORDS = [
  'name', 'first', 'last', 'middle', 'email', 'mail', 'designation', 'title', 'position',
  'role', 'department', 'dept', 'company', 'organization', 'org', 'city', 'state',
  'country', 'nationality', 'occupation', 'profession', 'father', 'mother', 'spouse',
  'guardian', 'contact', 'reference', 'bank', 'account', 'branch', 'ifsc', 'swift',
]

// Keywords that indicate large/full width fields
const LARGE_KEYWORDS = [
  'address', 'street', 'location', 'place', 'description', 'desc', 'note', 'notes',
  'comment', 'comments', 'remark', 'remarks', 'feedback', 'message', 'about', 'bio',
  'summary', 'objective', 'experience', 'education', 'qualification', 'skills',
  'instruction', 'detail', 'details', 'additional', 'other', 'misc', 'miscellaneous',
]

/**
 * Auto-detect field width based on placeholder name and type
 */
export function detectFieldWidth(placeholder: Placeholder): FieldWidth {
  // If manually set, use that
  if (placeholder.width) {
    return placeholder.width
  }

  const nameLower = placeholder.name.toLowerCase()
  const labelLower = placeholder.label.toLowerCase()
  const combined = `${nameLower} ${labelLower}`

  // Textarea fields are always full width
  if (placeholder.type === 'textarea') {
    return 'full'
  }

  // Check for large/full width keywords first
  if (LARGE_KEYWORDS.some(keyword => combined.includes(keyword))) {
    return 'full'
  }

  // Check for compact width keywords
  if (COMPACT_KEYWORDS.some(keyword => combined.includes(keyword))) {
    return 'compact'
  }

  // Check for medium width keywords
  if (MEDIUM_KEYWORDS.some(keyword => combined.includes(keyword))) {
    return 'medium'
  }

  // Type-based defaults
  if (placeholder.type === 'date' || placeholder.type === 'number') {
    return 'compact'
  }

  if (placeholder.type === 'email') {
    return 'medium'
  }

  if (placeholder.type === 'select') {
    return 'medium'
  }

  // Default to medium for text fields
  return 'medium'
}

// Static mapping for col-span classes (Tailwind requires static strings, not dynamic)
// Maps to a 6-column grid layout
const COL_SPAN_CLASSES = {
  1: 'col-span-6 sm:col-span-3 lg:col-span-1',
  2: 'col-span-6 sm:col-span-3 lg:col-span-2',
  3: 'col-span-6 sm:col-span-6 lg:col-span-3',
  4: 'col-span-6 sm:col-span-6 lg:col-span-4',
  5: 'col-span-6 sm:col-span-6 lg:col-span-5',
  6: 'col-span-6',
} as const

// Map FieldWidth to span number (1-6)
const WIDTH_TO_SPAN: Record<FieldWidth, number> = {
  compact: 1,
  medium: 2,
  large: 3,
  xlarge: 4,
  full: 6,
}

/**
 * Clamp a number between 1 and 6
 */
export function clampSpan(span: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return Math.max(1, Math.min(6, Math.round(span))) as 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Get Tailwind CSS classes for field width
 * Uses a 6-column grid for maximum flexibility
 * Uses static class mappings to ensure Tailwind compilation works correctly
 */
export function getFieldWidthClasses(width: FieldWidth): string {
  const span = clampSpan(WIDTH_TO_SPAN[width] || 2)
  return COL_SPAN_CLASSES[span]
}

/**
 * Get field width classes from a numeric span value (1-6)
 */
export function getSpanClasses(span: number): string {
  const clampedSpan = clampSpan(span)
  return COL_SPAN_CLASSES[clampedSpan]
}

/**
 * Width options for manual selection (5 options)
 */
export const WIDTH_OPTIONS: { value: FieldWidth; label: string; icon: string }[] = [
  { value: 'compact', label: '1x', icon: '▪' },
  { value: 'medium', label: '2x', icon: '▪▪' },
  { value: 'large', label: '3x', icon: '▪▪▪' },
  { value: 'xlarge', label: '4x', icon: '▪▪▪▪' },
  { value: 'full', label: 'Full', icon: '▬' },
]

/**
 * Get display label for width
 */
export function getWidthLabel(width: FieldWidth): string {
  return WIDTH_OPTIONS.find(o => o.value === width)?.label || '2x'
}
