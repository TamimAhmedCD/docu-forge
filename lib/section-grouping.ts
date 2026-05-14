import { Placeholder, FormSection, SectionConfig, FieldGroup } from '@/types'

// Group colors for visual distinction
export const GROUP_COLORS = [
  'bg-blue-500/10 border-blue-500/30',
  'bg-green-500/10 border-green-500/30',
  'bg-purple-500/10 border-purple-500/30',
  'bg-orange-500/10 border-orange-500/30',
  'bg-pink-500/10 border-pink-500/30',
  'bg-cyan-500/10 border-cyan-500/30',
]

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
        groups: [],
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
        groups: [],
        order: order++,
        isExpanded: sections.length === 0, // Expand if it's the first section
      })
    }
  }
  
  return sections
}

/**
 * Create a default section config from placeholders
 * Initially NO sections - all placeholders are unassigned
 * Users manually create sections and drag placeholders into them
 */
export function createDefaultSectionConfig(_placeholders: Placeholder[]): SectionConfig {
  // No sections initially - placeholders are unassigned
  return {
    sections: [],
    isAutoGrouped: false,
    lastModified: new Date(),
  }
}

/**
 * Sync sections when placeholders change (e.g., after template update)
 * Preserves existing section structure
 * New placeholders remain UNASSIGNED - they are NOT added to any section
 * Users must manually drag them into sections
 */
export function syncSectionsWithPlaceholders(
  existingSections: FormSection[],
  newPlaceholders: Placeholder[],
  _isAutoGrouped: boolean // Ignored - we always use manual organization
): FormSection[] {
  const newPlaceholderIds = new Set(newPlaceholders.map(p => p.id))
  
  // Remove placeholders that no longer exist from sections and groups
  // Note: Empty sections are preserved - they are NOT auto-deleted
  // New placeholders remain unassigned until user manually adds them to a section
  const updatedSections = existingSections.map(section => {
    // Filter groups to remove non-existent placeholders
    const updatedGroups = (section.groups || []).map(group => ({
      ...group,
      placeholderIds: group.placeholderIds.filter(id => newPlaceholderIds.has(id)),
    })).filter(group => group.placeholderIds.length > 0) // Remove empty groups
    
    // Get IDs of removed groups
    const validGroupIds = new Set(updatedGroups.map(g => g.id))
    
    // Filter placeholderIds - keep group references only if group still exists
    const filteredIds = section.placeholderIds.filter(id => {
      if (id.startsWith('group-')) {
        const groupId = id.replace('group-', '')
        return validGroupIds.has(groupId)
      }
      return newPlaceholderIds.has(id)
    })
    
    return {
      ...section,
      placeholderIds: filteredIds,
      groups: updatedGroups,
    }
  })
  
  // New placeholders are NOT added to any section
  // They will appear in the "Unassigned Fields" area in the UI
  return updatedSections
}

/**
 * Move a placeholder from one section to another
 * Note: Empty sections are preserved - they are NOT auto-deleted
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
      // Ensure placeholder is not already in the section
      if (!newIds.includes(placeholderId)) {
        if (targetIndex !== undefined) {
          newIds.splice(targetIndex, 0, placeholderId)
        } else {
          newIds.push(placeholderId)
        }
      }
      return {
        ...section,
        placeholderIds: newIds,
      }
    }
    return section
  })
  // Empty sections are preserved - no filtering
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
      groups: [],
      order: sections.length,
      isExpanded: true,
    },
  ]
}

/**
 * Create a new section with specific placeholder fields (not grouped)
 * Removes the placeholders from their current sections and adds them to the new section
 */
export function createSectionWithFields(
  sections: FormSection[],
  placeholderIds: string[],
  sectionName: string
): FormSection[] {
  // Remove placeholders from all existing sections and groups
  let updatedSections = sections.map(section => {
    // Remove from section's direct placeholders
    const filteredPlaceholderIds = section.placeholderIds.filter(
      id => !placeholderIds.includes(id)
    )
    
    // Remove from groups within the section
    const updatedGroups = section.groups.map(group => ({
      ...group,
      placeholderIds: group.placeholderIds.filter(id => !placeholderIds.includes(id))
    })).filter(group => group.placeholderIds.length > 0) // Remove empty groups
    
    return {
      ...section,
      placeholderIds: filteredPlaceholderIds,
      groups: updatedGroups,
    }
  })
  
  // Create the new section with the placeholders
  const newSection: FormSection = {
    id: crypto.randomUUID(),
    name: sectionName,
    placeholderIds: placeholderIds,
    groups: [],
    order: updatedSections.length,
    isExpanded: true,
  }
  
  return [...updatedSections, newSection]
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
  // Get all placeholder IDs including those in groups
  const allPlaceholderIds = getAllPlaceholderIdsInSection(section)
  const sectionPlaceholders = placeholders.filter(p => allPlaceholderIds.includes(p.id))
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

/**
 * Get all placeholder IDs in a section (including those in groups)
 */
export function getAllPlaceholderIdsInSection(section: FormSection): string[] {
  const ids: string[] = []
  
  for (const itemId of section.placeholderIds) {
    if (itemId.startsWith('group-')) {
      const groupId = itemId.replace('group-', '')
      const group = section.groups?.find(g => g.id === groupId)
      if (group) {
        ids.push(...group.placeholderIds)
      }
    } else {
      ids.push(itemId)
    }
  }
  
  return ids
}

/**
 * Create a new group from selected placeholders
 */
export function createGroup(
  sections: FormSection[],
  sectionId: string,
  placeholderIds: string[],
  groupName: string
): FormSection[] {
  const colorIndex = sections.reduce((acc, s) => acc + (s.groups?.length || 0), 0) % GROUP_COLORS.length
  
  return sections.map(section => {
    if (section.id !== sectionId) return section
    
    const newGroup: FieldGroup = {
      id: crypto.randomUUID(),
      name: groupName,
      placeholderIds: placeholderIds,
      isExpanded: true,
      color: GROUP_COLORS[colorIndex],
    }
    
    // Find the position of the first selected placeholder
    const firstIndex = section.placeholderIds.findIndex(id => placeholderIds.includes(id))
    
    // Remove selected placeholders from section
    const newPlaceholderIds = section.placeholderIds.filter(id => !placeholderIds.includes(id))
    
    // Insert group reference at the first placeholder's position
    const insertIndex = firstIndex >= 0 ? Math.min(firstIndex, newPlaceholderIds.length) : newPlaceholderIds.length
    newPlaceholderIds.splice(insertIndex, 0, `group-${newGroup.id}`)
    
    return {
      ...section,
      placeholderIds: newPlaceholderIds,
      groups: [...(section.groups || []), newGroup],
    }
  })
}

/**
 * Create a new section with a group inside it
 * This is used when user wants to organize placeholders into a section with a group
 */
export function createSectionWithGroup(
  sections: FormSection[],
  placeholderIds: string[],
  sectionName: string,
  groupName: string
): FormSection[] {
  const colorIndex = sections.reduce((acc, s) => acc + (s.groups?.length || 0), 0) % GROUP_COLORS.length
  
  const newGroup: FieldGroup = {
    id: crypto.randomUUID(),
    name: groupName,
    placeholderIds: placeholderIds,
    isExpanded: true,
    color: GROUP_COLORS[colorIndex],
  }
  
  const newSection: FormSection = {
    id: crypto.randomUUID(),
    name: sectionName,
    placeholderIds: [`group-${newGroup.id}`],
    groups: [newGroup],
    order: sections.length,
    isExpanded: true,
  }
  
  return [...sections, newSection]
}

/**
 * Ungroup a field group (move placeholders back to section)
 */
export function ungroupFields(
  sections: FormSection[],
  sectionId: string,
  groupId: string
): FormSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section
    
    const group = section.groups?.find(g => g.id === groupId)
    if (!group) return section
    
    // Find the group reference position
    const groupRefIndex = section.placeholderIds.indexOf(`group-${groupId}`)
    
    // Replace group reference with individual placeholders
    const newPlaceholderIds = [...section.placeholderIds]
    if (groupRefIndex >= 0) {
      newPlaceholderIds.splice(groupRefIndex, 1, ...group.placeholderIds)
    }
    
    return {
      ...section,
      placeholderIds: newPlaceholderIds,
      groups: section.groups?.filter(g => g.id !== groupId) || [],
    }
  })
}

/**
 * Toggle group expanded state
 */
export function toggleGroupExpanded(
  sections: FormSection[],
  sectionId: string,
  groupId: string
): FormSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section
    
    return {
      ...section,
      groups: section.groups?.map(g => 
        g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g
      ) || [],
    }
  })
}

/**
 * Rename a group
 */
export function renameGroup(
  sections: FormSection[],
  sectionId: string,
  groupId: string,
  newName: string
): FormSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section
    
    return {
      ...section,
      groups: section.groups?.map(g => 
        g.id === groupId ? { ...g, name: newName } : g
      ) || [],
    }
  })
}

/**
 * Move a group from one section to another
 */
export function moveGroup(
  sections: FormSection[],
  groupId: string,
  fromSectionId: string,
  toSectionId: string,
  targetIndex?: number
): FormSection[] {
  const fromSection = sections.find(s => s.id === fromSectionId)
  const group = fromSection?.groups?.find(g => g.id === groupId)
  if (!group) return sections
  
  return sections.map(section => {
    if (section.id === fromSectionId) {
      return {
        ...section,
        placeholderIds: section.placeholderIds.filter(id => id !== `group-${groupId}`),
        groups: section.groups?.filter(g => g.id !== groupId) || [],
      }
    }
    if (section.id === toSectionId) {
      const newIds = [...section.placeholderIds]
      if (targetIndex !== undefined) {
        newIds.splice(targetIndex, 0, `group-${groupId}`)
      } else {
        newIds.push(`group-${groupId}`)
      }
      return {
        ...section,
        placeholderIds: newIds,
        groups: [...(section.groups || []), group],
      }
    }
    return section
  })
}

/**
 * Reorder items within a section (handles both placeholders and groups)
 */
export function reorderSectionItems(
  sections: FormSection[],
  sectionId: string,
  fromIndex: number,
  toIndex: number
): FormSection[] {
  return sections.map(section => {
    if (section.id !== sectionId) return section
    
    const newIds = [...section.placeholderIds]
    const [removed] = newIds.splice(fromIndex, 1)
    newIds.splice(toIndex, 0, removed)
    
    return {
      ...section,
      placeholderIds: newIds,
    }
  })
}

/**
 * Add an unassigned placeholder to a section
 */
export function addPlaceholderToSection(
  sections: FormSection[],
  placeholderId: string,
  toSectionId: string,
  targetIndex?: number
): FormSection[] {
  return sections.map(section => {
    if (section.id === toSectionId) {
      const newIds = [...section.placeholderIds]
      // Ensure placeholder is not already in the section
      if (!newIds.includes(placeholderId)) {
        if (targetIndex !== undefined) {
          newIds.splice(targetIndex, 0, placeholderId)
        } else {
          newIds.push(placeholderId)
        }
      }
      return {
        ...section,
        placeholderIds: newIds,
      }
    }
    return section
  })
}

/**
 * Remove a placeholder from a section (make it unassigned)
 */
export function removePlaceholderFromSection(
  sections: FormSection[],
  placeholderId: string,
  fromSectionId: string
): FormSection[] {
  return sections.map(section => {
    if (section.id === fromSectionId) {
      return {
        ...section,
        placeholderIds: section.placeholderIds.filter(id => id !== placeholderId),
      }
    }
    return section
  })
}
