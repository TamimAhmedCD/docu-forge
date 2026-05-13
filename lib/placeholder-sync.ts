import { Placeholder, PlaceholderSyncResult, PlaceholderSyncStatus } from '@/types'
import { detectPlaceholders } from './placeholder-utils'

/**
 * Smart merge algorithm for syncing placeholders between old and new templates
 * Preserves existing form data and configurations while detecting changes
 */
export function syncPlaceholders(
  existingPlaceholders: Placeholder[],
  newDocumentText: string
): PlaceholderSyncResult {
  // Detect placeholders from new document
  const detectedPlaceholders = detectPlaceholders(newDocumentText)
  
  // Create maps for efficient lookup
  const existingByName = new Map<string, Placeholder>()
  existingPlaceholders.forEach(p => {
    existingByName.set(p.name.toLowerCase(), p)
  })
  
  const detectedNames = new Set<string>()
  detectedPlaceholders.forEach(p => {
    detectedNames.add(p.name.toLowerCase())
  })
  
  const syncedPlaceholders: Placeholder[] = []
  let syncedCount = 0
  let newCount = 0
  let removedCount = 0
  const removedPlaceholders: Placeholder[] = []
  
  // Process detected placeholders
  detectedPlaceholders.forEach(detected => {
    const nameLower = detected.name.toLowerCase()
    const existing = existingByName.get(nameLower)
    
    if (existing) {
      // Placeholder exists - preserve existing configuration
      syncedPlaceholders.push({
        ...existing,
        name: detected.name, // Use the name from the new document (preserves case)
        syncStatus: 'synced' as PlaceholderSyncStatus,
      })
      syncedCount++
    } else {
      // New placeholder - add with default configuration
      syncedPlaceholders.push({
        ...detected,
        syncStatus: 'new' as PlaceholderSyncStatus,
      })
      newCount++
    }
  })
  
  // Find removed placeholders (exist in old but not in new)
  existingPlaceholders.forEach(existing => {
    const nameLower = existing.name.toLowerCase()
    if (!detectedNames.has(nameLower)) {
      // Mark as removed but preserve the data
      removedPlaceholders.push({
        ...existing,
        syncStatus: 'removed' as PlaceholderSyncStatus,
      })
      removedCount++
    }
  })
  
  return {
    placeholders: syncedPlaceholders,
    syncedCount,
    newCount,
    removedCount,
    removedPlaceholders,
  }
}

/**
 * Merge form data with new placeholder structure
 * Preserves values for existing fields, adds empty values for new fields
 */
export function mergeFormData(
  existingFormData: Record<string, string | number | Date>,
  oldPlaceholders: Placeholder[],
  newPlaceholders: Placeholder[]
): Record<string, string | number | Date> {
  const mergedData: Record<string, string | number | Date> = {}
  
  // Create a map of old placeholder names to their IDs
  const oldNameToId = new Map<string, string>()
  oldPlaceholders.forEach(p => {
    oldNameToId.set(p.name.toLowerCase(), p.id)
  })
  
  // Process new placeholders
  newPlaceholders.forEach(placeholder => {
    const oldId = oldNameToId.get(placeholder.name.toLowerCase())
    
    if (oldId && existingFormData[oldId] !== undefined) {
      // Transfer existing value to new placeholder ID
      mergedData[placeholder.id] = existingFormData[oldId]
    } else if (placeholder.defaultValue) {
      // Use default value for new fields
      mergedData[placeholder.id] = placeholder.defaultValue
    } else {
      // Initialize empty value
      mergedData[placeholder.id] = ''
    }
  })
  
  return mergedData
}

/**
 * Get warning messages for removed placeholders that had form data
 */
export function getFormDataWarnings(
  formData: Record<string, string | number | Date>,
  removedPlaceholders: Placeholder[]
): { placeholder: Placeholder; value: string | number | Date }[] {
  const warnings: { placeholder: Placeholder; value: string | number | Date }[] = []
  
  removedPlaceholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    if (value !== undefined && value !== '') {
      warnings.push({ placeholder, value })
    }
  })
  
  return warnings
}

/**
 * Clear sync status from all placeholders (for saving)
 */
export function clearSyncStatus(placeholders: Placeholder[]): Placeholder[] {
  return placeholders.map(p => {
    const { syncStatus, ...rest } = p
    return rest
  })
}
