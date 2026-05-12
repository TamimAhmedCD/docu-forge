import { Placeholder, FieldType } from '@/types'

// Detect placeholders in text content
export function detectPlaceholders(text: string): Placeholder[] {
  const placeholders: Placeholder[] = []
  const seen = new Set<string>()

  // Match {{placeholder}} format
  const curlyBraceRegex = /\{\{([^}]+)\}\}/g
  let match
  while ((match = curlyBraceRegex.exec(text)) !== null) {
    const name = match[1].trim()
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      placeholders.push(createPlaceholder(name))
    }
  }

  // Match [PLACEHOLDER] format
  const bracketRegex = /\[([A-Z_]+)\]/g
  while ((match = bracketRegex.exec(text)) !== null) {
    const name = match[1].trim()
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      placeholders.push(createPlaceholder(name))
    }
  }

  return placeholders
}

function createPlaceholder(name: string): Placeholder {
  const id = crypto.randomUUID()
  const label = formatLabel(name)
  const type = inferFieldType(name)

  return {
    id,
    name,
    type,
    label,
    required: true,
  }
}

function formatLabel(name: string): string {
  // Convert snake_case or SCREAMING_CASE to Title Case
  return name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function inferFieldType(name: string): FieldType {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('email')) return 'email'
  if (lowerName.includes('date') || lowerName.includes('dob') || lowerName.includes('birthday')) return 'date'
  if (lowerName.includes('phone') || lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('quantity') || lowerName.includes('number') || lowerName.includes('age')) return 'number'
  if (lowerName.includes('description') || lowerName.includes('address') || lowerName.includes('comment') || lowerName.includes('notes')) return 'textarea'
  
  return 'text'
}

export function replacePlaceholders(text: string, values: Record<string, string>): string {
  let result = text

  // Replace {{placeholder}} format
  Object.entries(values).forEach(([key, value]) => {
    const curlyRegex = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'gi')
    result = result.replace(curlyRegex, value)
  })

  // Replace [PLACEHOLDER] format
  Object.entries(values).forEach(([key, value]) => {
    const bracketRegex = new RegExp(`\\[${escapeRegex(key.toUpperCase())}\\]`, 'g')
    result = result.replace(bracketRegex, value)
  })

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
