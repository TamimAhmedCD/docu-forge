import { useState, useCallback, useEffect, useRef } from 'react'
import { FormSection, SectionConfig, Placeholder } from '@/types'
import { createDefaultSectionConfig, syncSectionsWithPlaceholders } from '@/lib/section-grouping'

interface SectionStorageResult {
  sections: FormSection[]
  isAutoGrouped: boolean
  isLoaded: boolean
  hasDbData: boolean // True if DB returned actual data for this config
  setSections: (sections: FormSection[]) => void
  setIsAutoGrouped: (value: boolean) => void
  syncWithPlaceholders: (placeholders: Placeholder[]) => void
  resetToDefault: (placeholders: Placeholder[]) => void
}

export function useSectionStorage(templateIds: string[]): SectionStorageResult {
  const [sectionConfigs, setSectionConfigs] = useState<Record<string, SectionConfig>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  // Track which config keys have data from the database (vs. being newly created)
  const [dbLoadedKeys, setDbLoadedKeys] = useState<Set<string>>(new Set())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Track if we're in the initial load phase to prevent premature saves
  const isInitialLoadRef = useRef(true)

  // Create a composite key for the selected templates
  const configKey = templateIds.sort().join('|')

  // Load section config from MongoDB on mount or when templateIds change
  useEffect(() => {
    if (!configKey) {
      setIsLoaded(true)
      isInitialLoadRef.current = false
      return
    }

    // Mark as loading
    setIsLoaded(false)
    isInitialLoadRef.current = true

    const loadConfig = async () => {
      try {
        const response = await fetch(`/api/section-config?templateKey=${encodeURIComponent(configKey)}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.sections && data.sections.length > 0) {
            // DB has actual data - use it
            setSectionConfigs(prev => ({
              ...prev,
              [configKey]: {
                sections: data.sections,
                isAutoGrouped: data.isAutoGrouped,
                lastModified: new Date(data.lastModified),
              },
            }))
            // Mark this key as having DB data
            setDbLoadedKeys(prev => new Set(prev).add(configKey))
          }
          // If data is null or empty, we don't set anything - let syncWithPlaceholders create defaults
        }
      } catch (error) {
        console.error('Failed to load section config from MongoDB:', error)
      } finally {
        setIsLoaded(true)
        // Allow saves after a short delay to ensure state has settled
        setTimeout(() => {
          isInitialLoadRef.current = false
        }, 100)
      }
    }

    loadConfig()
  }, [configKey])

  // Debounced save to MongoDB - ONLY called on user actions, not on initial load
  const saveToDatabase = useCallback((key: string, config: SectionConfig, forceImmediate = false) => {
    // CRITICAL: Never save during initial load phase
    if (isInitialLoadRef.current) {
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const doSave = async () => {
      try {
        await fetch('/api/section-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: key,
            sections: config.sections,
            isAutoGrouped: config.isAutoGrouped,
          }),
        })
      } catch (error) {
        console.error('Failed to save section config to MongoDB:', error)
      }
    }

    if (forceImmediate) {
      doSave()
    } else {
      saveTimeoutRef.current = setTimeout(doSave, 500) // Debounce 500ms to avoid too many saves during rapid changes
    }
  }, [])

  // Get current config or default
  const currentConfig = sectionConfigs[configKey] || null

  const setSections = useCallback((sections: FormSection[]) => {
    setSectionConfigs(prev => {
      const updated = {
        ...prev,
        [configKey]: {
          sections,
          isAutoGrouped: prev[configKey]?.isAutoGrouped ?? true,
          lastModified: new Date(),
        },
      }
      saveToDatabase(configKey, updated[configKey])
      return updated
    })
  }, [configKey, saveToDatabase])

  const setIsAutoGrouped = useCallback((value: boolean) => {
    setSectionConfigs(prev => {
      if (!prev[configKey]) return prev
      const updated = {
        ...prev,
        [configKey]: {
          ...prev[configKey],
          isAutoGrouped: value,
          lastModified: new Date(),
        },
      }
      saveToDatabase(configKey, updated[configKey])
      return updated
    })
  }, [configKey, saveToDatabase])

  const syncWithPlaceholders = useCallback((placeholders: Placeholder[]) => {
    setSectionConfigs(prev => {
      const existing = prev[configKey]
      
      if (!existing) {
        // No config exists yet - create default WITHOUT saving
        // This only happens when DB is empty for this template combination
        // Save will happen when user makes an actual change
        const newConfig = createDefaultSectionConfig(placeholders)
        const updated = { ...prev, [configKey]: newConfig }
        // DO NOT save here - only create local state
        // saveToDatabase will be called when user actually changes something
        return updated
      }

      // Sync existing sections with new placeholders
      // New placeholders always go to "Ungrouped Fields" - never auto-grouped
      const syncedSections = syncSectionsWithPlaceholders(
        existing.sections,
        placeholders,
        false // Always manual organization
      )

      // Check if sections actually changed
      const sectionsChanged = JSON.stringify(existing.sections) !== JSON.stringify(syncedSections)

      const updatedConfig = {
        ...existing,
        sections: syncedSections,
        isAutoGrouped: false, // Ensure manual organization
        lastModified: new Date(),
      }

      const updated = {
        ...prev,
        [configKey]: updatedConfig,
      }
      
      // Only save if sections actually changed AND we're not in initial load
      if (sectionsChanged && !isInitialLoadRef.current) {
        saveToDatabase(configKey, updatedConfig)
      }
      return updated
    })
  }, [configKey, saveToDatabase])

  const resetToDefault = useCallback((placeholders: Placeholder[]) => {
    // Reset to ungrouped state - all placeholders in "Ungrouped Fields"
    const newConfig = createDefaultSectionConfig(placeholders)
    setSectionConfigs(prev => {
      const updated = { ...prev, [configKey]: newConfig }
      saveToDatabase(configKey, newConfig)
      return updated
    })
  }, [configKey, saveToDatabase])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    sections: currentConfig?.sections || [],
    isAutoGrouped: currentConfig?.isAutoGrouped ?? true,
    isLoaded,
    hasDbData: dbLoadedKeys.has(configKey),
    setSections,
    setIsAutoGrouped,
    syncWithPlaceholders,
    resetToDefault,
  }
}

/**
 * Delete section config from MongoDB for a template
 * Called when a template is deleted
 */
export async function deleteSectionConfig(templateId: string): Promise<void> {
  try {
    await fetch(`/api/section-config?templateId=${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Failed to delete section config:', error)
  }
}
