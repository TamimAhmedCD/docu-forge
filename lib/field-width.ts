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

/**
 * Get Tailwind CSS classes for field width
 * Uses a 6-column grid for maximum flexibility
 */
export function getFieldWidthClasses(width: FieldWidth): string {
  switch (width) {
    case 'compact':
      // 1/6 on desktop, 1/3 on tablet, full on mobile
      return 'col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-1'
    case 'medium':
      // 2/6 on desktop, 1/2 on tablet, full on mobile
      return 'col-span-6 sm:col-span-3 md:col-span-2'
    case 'large':
      // 4/6 on desktop, full on tablet/mobile
      return 'col-span-6 md:col-span-4'
    case 'full':
      // Full width always
      return 'col-span-6'
    default:
      return 'col-span-6 sm:col-span-3 md:col-span-2'
  }
}

/**
 * Width options for manual selection
 */
export const WIDTH_OPTIONS: { value: FieldWidth; label: string; icon: string }[] = [
  { value: 'compact', label: '1x', icon: '▪' },
  { value: 'medium', label: '2x', icon: '▪▪' },
  { value: 'large', label: '3x', icon: '▪▪▪' },
  { value: 'full', label: 'Full', icon: '▬' },
]

/**
 * Get display label for width
 */
export function getWidthLabel(width: FieldWidth): string {
  return WIDTH_OPTIONS.find(o => o.value === width)?.label || '2x'
}
