import { useState, useCallback, useEffect } from 'react'
import { FormSection, SectionConfig, Placeholder } from '@/types'
import { createDefaultSectionConfig, syncSectionsWithPlaceholders } from '@/lib/section-grouping'

const SECTION_CONFIG_KEY = 'document-generator-section-config'

interface SectionStorageResult {
  sections: FormSection[]
  isAutoGrouped: boolean
  isLoaded: boolean
  setSections: (sections: FormSection[]) => void
  setIsAutoGrouped: (value: boolean) => void
  syncWithPlaceholders: (placeholders: Placeholder[]) => void
  resetToDefault: (placeholders: Placeholder[]) => void
}

export function useSectionStorage(templateIds: string[]): SectionStorageResult {
  const [sectionConfigs, setSectionConfigs] = useState<Record<string, SectionConfig>>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // Create a composite key for the selected templates
  const configKey = templateIds.sort().join('|')

  // Load section configs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SECTION_CONFIG_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert date strings back to Date objects
          const restored: Record<string, SectionConfig> = {}
          for (const [key, config] of Object.entries(parsed)) {
            const c = config as SectionConfig
            restored[key] = {
              ...c,
              lastModified: new Date(c.lastModified),
            }
          }
          setSectionConfigs(restored)
        }
      } catch (error) {
        console.error('Failed to load section config from localStorage:', error)
      }
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage whenever configs change
  const saveConfigs = useCallback((configs: Record<string, SectionConfig>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SECTION_CONFIG_KEY, JSON.stringify(configs))
      } catch (error) {
        console.error('Failed to save section config to localStorage:', error)
      }
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
      saveConfigs(updated)
      return updated
    })
  }, [configKey, saveConfigs])

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
      saveConfigs(updated)
      return updated
    })
  }, [configKey, saveConfigs])

  const syncWithPlaceholders = useCallback((placeholders: Placeholder[]) => {
    setSectionConfigs(prev => {
      const existing = prev[configKey]
      
      if (!existing) {
        // Create new config with auto-grouped sections
        const newConfig = createDefaultSectionConfig(placeholders)
        const updated = { ...prev, [configKey]: newConfig }
        saveConfigs(updated)
        return updated
      }

      // Sync existing sections with new placeholders
      const syncedSections = syncSectionsWithPlaceholders(
        existing.sections,
        placeholders,
        existing.isAutoGrouped
      )

      const updated = {
        ...prev,
        [configKey]: {
          ...existing,
          sections: syncedSections,
          lastModified: new Date(),
        },
      }
      saveConfigs(updated)
      return updated
    })
  }, [configKey, saveConfigs])

  const resetToDefault = useCallback((placeholders: Placeholder[]) => {
    const newConfig = createDefaultSectionConfig(placeholders)
    setSectionConfigs(prev => {
      const updated = { ...prev, [configKey]: newConfig }
      saveConfigs(updated)
      return updated
    })
  }, [configKey, saveConfigs])

  return {
    sections: currentConfig?.sections || [],
    isAutoGrouped: currentConfig?.isAutoGrouped ?? true,
    isLoaded,
    setSections,
    setIsAutoGrouped,
    syncWithPlaceholders,
    resetToDefault,
  }
}
