import { useState, useCallback, useEffect, useRef } from 'react'
import { FormSection, SectionConfig, Placeholder } from '@/types'
import { createDefaultSectionConfig, syncSectionsWithPlaceholders } from '@/lib/section-grouping'

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Create a composite key for the selected templates
  const configKey = templateIds.sort().join('|')

  // Load section config from MongoDB on mount or when templateIds change
  useEffect(() => {
    if (!configKey) {
      setIsLoaded(true)
      return
    }

    const loadConfig = async () => {
      try {
        const response = await fetch(`/api/section-config?templateKey=${encodeURIComponent(configKey)}`)
        if (response.ok) {
          const data = await response.json()
          if (data) {
            setSectionConfigs(prev => ({
              ...prev,
              [configKey]: {
                sections: data.sections,
                isAutoGrouped: data.isAutoGrouped,
                lastModified: new Date(data.lastModified),
              },
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load section config from MongoDB:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadConfig()
  }, [configKey])

  // Debounced save to MongoDB
  const saveToDatabase = useCallback((key: string, config: SectionConfig) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
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
    }, 500) // Debounce 500ms to avoid too many saves during rapid changes
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
        // Create new config with auto-grouped sections
        const newConfig = createDefaultSectionConfig(placeholders)
        const updated = { ...prev, [configKey]: newConfig }
        saveToDatabase(configKey, newConfig)
        return updated
      }

      // Sync existing sections with new placeholders
      const syncedSections = syncSectionsWithPlaceholders(
        existing.sections,
        placeholders,
        existing.isAutoGrouped
      )

      const updatedConfig = {
        ...existing,
        sections: syncedSections,
        lastModified: new Date(),
      }

      const updated = {
        ...prev,
        [configKey]: updatedConfig,
      }
      saveToDatabase(configKey, updatedConfig)
      return updated
    })
  }, [configKey, saveToDatabase])

  const resetToDefault = useCallback((placeholders: Placeholder[]) => {
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
    setSections,
    setIsAutoGrouped,
    syncWithPlaceholders,
    resetToDefault,
  }
}
