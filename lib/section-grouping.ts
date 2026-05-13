import { Placeholder, FormSection, SectionConfig } from '@/types'

// Auto-detection rules for grouping placeholders
const SECTION_RULES: { name: string; keywords: string[] }[] = [
  {
    name: 'Personal Information',
    keywords: ['NAME', 'FATHER', 'MOTHER', 'PHONE', 'ADDRESS', 'EMAIL', 'MOBILE', 'CONTACT', 'BIRTH', 'AGE', 'GENDER', 'NATIONALITY', 'RELIGION', 'MARITAL', 'SPOUSE', 'GUARDIAN', 'BLOOD'],
  },
  {
    name: 'Job Information',
    keywords: ['SALARY', 'DESIGNATION', 'JOB', 'DEPARTMENT', 'POSITION', 'EMPLOYEE', 'COMPANY', 'ORGANIZATION', 'OFFICE', 'WORK', 'JOINING', 'EMPLOYMENT', 'OCCUPATION', 'PROFESSION', 'ROLE', 'TITLE', 'MANAGER', 'SUPERVISOR'],
  },
  {
    name: 'Document Information',
    keywords: ['DATE', 'CERTIFICATE', 'DOCUMENT', 'ID', 'NUMBER', 'SERIAL', 'REF', 'REFERENCE', 'ISSUE', 'EXPIRY', 'VALIDITY', 'LICENSE', 'REGISTRATION', 'PASSPORT', 'NID', 'NATIONAL'],
  },
  {
    name: 'Education Information',
    keywords: ['EDUCATION', 'DEGREE', 'UNIVERSITY', 'COLLEGE', 'SCHOOL', 'INSTITUTE', 'QUALIFICATION', 'GRADE', 'RESULT', 'CGPA', 'GPA', 'PASSING', 'BOARD', 'MAJOR', 'SUBJECT'],
  },
  {
    name: 'Financial Information',
    keywords: ['BANK', 'ACCOUNT', 'PAYMENT', 'AMOUNT', 'PRICE', 'COST', 'FEE', 'CHARGE', 'TRANSACTION', 'BALANCE', 'CREDIT', 'DEBIT', 'TAX', 'INCOME'],
  },
  {
    name: 'Address Information',
    keywords: ['STREET', 'CITY', 'STATE', 'COUNTRY', 'ZIP', 'POSTAL', 'REGION', 'DISTRICT', 'DIVISION', 'VILLAGE', 'TOWN', 'AREA', 'LOCATION', 'PERMANENT', 'PRESENT', 'MAILING'],
  },
]

/**
 * Detect which section a placeholder belongs to based on its name
 */
function detectSection(placeholderName: string): string {
  const upperName = placeholderName.toUpperCase()
  
  for (const rule of SECTION_RULES) {
    for (const keyword of rule.keywords) {
      if (upperName.includes(keyword)) {
        return rule.name
      }
    }
  }
  
  return 'Other Fields'
}

/**
 * Auto-group placeholders into sections based on naming patterns
 */
export function autoGroupPlaceholders(placeholders: Placeholder[]): FormSection[] {
  const sectionMap = new Map<string, string[]>()
  
  // Group placeholder IDs by detected section
  for (const placeholder of placeholders) {
    const sectionName = detectSection(placeholder.name)
    const existing = sectionMap.get(sectionName) || []
    existing.push(placeholder.id)
    sectionMap.set(sectionName, existing)
  }
  
  // Convert map to ordered sections array
  const sections: FormSection[] = []
  let order = 0
  
  // Add sections in the order defined by SECTION_RULES first
  for (const rule of SECTION_RULES) {
    const ids = sectionMap.get(rule.name)
    if (ids && ids.length > 0) {
      sections.push({
        id: crypto.randomUUID(),
        name: rule.name,
        placeholderIds: ids,
        order: order++,
        isExpanded: order === 1, // First section expanded by default
      })
      sectionMap.delete(rule.name)
    }
  }
  
  // Add remaining sections (like "Other Fields")
  for (const [name, ids] of sectionMap) {
    if (ids.length > 0) {
      sections.push({
        id: crypto.randomUUID(),
        name,
        placeholderIds: ids,
        order: order++,
        isExpanded: sections.length === 0, // Expand if it's the first section
      })
    }
  }
  
  return sections
}

/**
 * Create a default section config from placeholders
 */
export function createDefaultSectionConfig(placeholders: Placeholder[]): SectionConfig {
  return {
    sections: autoGroupPlaceholders(placeholders),
    isAutoGrouped: true,
    lastModified: new Date(),
  }
}

/**
 * Sync sections when placeholders change (e.g., after template update)
 * Preserves existing section structure and adds new placeholders to appropriate sections
 */
export function syncSectionsWithPlaceholders(
  existingSections: FormSection[],
  newPlaceholders: Placeholder[],
  isAutoGrouped: boolean
): FormSection[] {
  const newPlaceholderIds = new Set(newPlaceholders.map(p => p.id))
  const existingPlaceholderIds = new Set(existingSections.flatMap(s => s.placeholderIds))
  
  // Find new placeholders not in any section
  const newIds = newPlaceholders
    .filter(p => !existingPlaceholderIds.has(p.id))
    .map(p => p.id)
  
  // Remove placeholders that no longer exist from sections
  const updatedSections = existingSections.map(section => ({
    ...section,
    placeholderIds: section.placeholderIds.filter(id => newPlaceholderIds.has(id)),
  })).filter(section => section.placeholderIds.length > 0)
  
  if (newIds.length === 0) {
    return updatedSections
  }
  
  if (isAutoGrouped) {
    // Auto-assign new placeholders to appropriate sections
    const newPlaceholdersToGroup = newPlaceholders.filter(p => newIds.includes(p.id))
    
    for (const placeholder of newPlaceholdersToGroup) {
      const sectionName = detectSection(placeholder.name)
      const existingSection = updatedSections.find(s => s.name === sectionName)
      
      if (existingSection) {
        existingSection.placeholderIds.push(placeholder.id)
      } else {
        // Create new section for this placeholder
        updatedSections.push({
          id: crypto.randomUUID(),
          name: sectionName,
          placeholderIds: [placeholder.id],
          order: updatedSections.length,
          isExpanded: false,
        })
      }
    }
  } else {
    // Add to "Needs Review" section for manual assignment
    const needsReviewSection = updatedSections.find(s => s.name === 'Needs Review')
    
    if (needsReviewSection) {
      needsReviewSection.placeholderIds.push(...newIds)
    } else {
      updatedSections.push({
        id: crypto.randomUUID(),
        name: 'Needs Review',
        placeholderIds: newIds,
        order: updatedSections.length,
        isExpanded: true,
      })
    }
  }
  
  return updatedSections
}

/**
 * Move a placeholder from one section to another
 */
export function movePlaceholder(
  sections: FormSection[],
  placeholderId: string,
  fromSectionId: string,
  toSectionId: string,
  targetIndex?: number
): FormSection[] {
  return sections.map(section => {
    if (section.id === fromSectionId) {
      return {
        ...section,
        placeholderIds: section.placeholderIds.filter(id => id !== placeholderId),
      }
    }
    if (section.id === toSectionId) {
      const newIds = [...section.placeholderIds]
      if (targetIndex !== undefined) {
        newIds.splice(targetIndex, 0, placeholderId)
      } else {
        newIds.push(placeholderId)
      }
      return {
        ...section,
        placeholderIds: newIds,
      }
    }
    return section
  }).filter(section => section.placeholderIds.length > 0 || section.name === 'Other Fields')
}

/**
 * Reorder sections
 */
export function reorderSections(sections: FormSection[], fromIndex: number, toIndex: number): FormSection[] {
  const result = [...sections]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result.map((section, index) => ({ ...section, order: index }))
}

/**
 * Add a new empty section
 */
export function addSection(sections: FormSection[], name: string): FormSection[] {
  return [
    ...sections,
    {
      id: crypto.randomUUID(),
      name,
      placeholderIds: [],
      order: sections.length,
      isExpanded: true,
    },
  ]
}

/**
 * Rename a section
 */
export function renameSection(sections: FormSection[], sectionId: string, newName: string): FormSection[] {
  return sections.map(section =>
    section.id === sectionId ? { ...section, name: newName } : section
  )
}

/**
 * Delete a section and optionally move its placeholders to another section
 */
export function deleteSection(
  sections: FormSection[],
  sectionId: string,
  moveToSectionId?: string
): FormSection[] {
  const sectionToDelete = sections.find(s => s.id === sectionId)
  if (!sectionToDelete) return sections
  
  let updatedSections = sections.filter(s => s.id !== sectionId)
  
  if (moveToSectionId && sectionToDelete.placeholderIds.length > 0) {
    updatedSections = updatedSections.map(section => {
      if (section.id === moveToSectionId) {
        return {
          ...section,
          placeholderIds: [...section.placeholderIds, ...sectionToDelete.placeholderIds],
        }
      }
      return section
    })
  }
  
  return updatedSections.map((section, index) => ({ ...section, order: index }))
}

/**
 * Toggle section expanded state
 */
export function toggleSectionExpanded(sections: FormSection[], sectionId: string): FormSection[] {
  return sections.map(section =>
    section.id === sectionId ? { ...section, isExpanded: !section.isExpanded } : section
  )
}

/**
 * Get section progress (filled fields / total fields)
 */
export function getSectionProgress(
  section: FormSection,
  placeholders: Placeholder[],
  formData: Record<string, unknown>
): { filled: number; total: number; percentage: number } {
  const sectionPlaceholders = placeholders.filter(p => section.placeholderIds.includes(p.id))
  const filled = sectionPlaceholders.filter(p => {
    const value = formData[p.id]
    return value !== undefined && value !== null && value !== ''
  }).length
  const total = sectionPlaceholders.length
  
  return {
    filled,
    total,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
  }
}
