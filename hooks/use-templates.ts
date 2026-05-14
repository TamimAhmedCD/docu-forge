'use client'

import { useSyncExternalStore, useCallback, useEffect, useState } from 'react'
import * as store from '@/lib/template-store'
import { Template, Placeholder, PlaceholderSyncResult } from '@/types'
import mammoth from 'mammoth'
import { detectPlaceholders } from '@/lib/placeholder-utils'
import { syncPlaceholders, clearSyncStatus } from '@/lib/placeholder-sync'
import { preserveFormDataOnUpdate, deleteTemplateFormData } from '@/hooks/use-form-storage'

export function useTemplates() {
  // Track loading state from store for all pages
  const [isLoading, setIsLoading] = useState(store.isStoreLoading())
  
  const templates = useSyncExternalStore(
    store.subscribe,
    store.getTemplates,
    store.getServerTemplates // Use server snapshot for SSR
  )

  // Initialize from MongoDB on mount
  // This runs once and waits for database to load before page renders
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      // Update loading state whenever store changes
      setIsLoading(store.isStoreLoading())
    })

    if (!store.isStoreInitialized()) {
      store.initializeFromDatabase().then(() => {
        setIsLoading(false)
      })
    } else {
      // Already initialized, make sure loading state is correct
      setIsLoading(store.isStoreLoading())
    }

    return unsubscribe
  }, [])

  const addTemplate = useCallback(async (file: File) => {
    const fileContent = await file.arrayBuffer()
    
    // Extract text from DOCX to detect placeholders
    const result = await mammoth.extractRawText({ arrayBuffer: fileContent })
    const placeholders = detectPlaceholders(result.value)

    const template: Template = {
      id: crypto.randomUUID(),
      name: file.name,
      file: new File([fileContent], file.name, { type: file.type }),
      fileContent,
      placeholders,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await store.addTemplate(template)
    return template
  }, [])

  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>) => {
    await store.updateTemplate(id, updates)
  }, [])

  const removeTemplate = useCallback(async (id: string) => {
    // Delete localStorage form data (cascade deletion)
    deleteTemplateFormData(id)
    // Delete from MongoDB (which also cascade deletes section configs)
    await store.removeTemplate(id)
  }, [])

  const getTemplate = useCallback((id: string) => {
    return store.getTemplate(id)
  }, [])

  const updatePlaceholders = useCallback(async (templateId: string, placeholders: Placeholder[]) => {
    // Clear sync status before saving
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    try {
      await store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
    } catch (error) {
      console.error('Failed to update placeholders:', error)
      throw error // Propagate error to caller for UI handling
    }
  }, [])

  /**
   * Update template file with smart placeholder sync
   * Preserves existing placeholder configurations and form data
   */
  const updateTemplateFile = useCallback(async (
    templateId: string,
    file: File
  ): Promise<PlaceholderSyncResult | null> => {
    const existingTemplate = store.getTemplate(templateId)
    if (!existingTemplate) return null

    const fileContent = await file.arrayBuffer()
    
    // Extract text from new DOCX
    const result = await mammoth.extractRawText({ arrayBuffer: fileContent })
    
    // Sync placeholders with existing configuration
    const syncResult = syncPlaceholders(existingTemplate.placeholders, result.value)
    
    // Preserve form data for placeholders that still exist
    const oldPlaceholderIds = existingTemplate.placeholders.map(p => p.id)
    const newPlaceholderIds = syncResult.placeholders.map(p => p.id)
    preserveFormDataOnUpdate(templateId, oldPlaceholderIds, newPlaceholderIds)
    
    // Update template with new file and synced placeholders
    await store.updateTemplate(templateId, {
      name: file.name,
      file: new File([fileContent], file.name, { type: file.type }),
      fileContent,
      placeholders: syncResult.placeholders,
      updatedAt: new Date(),
    })

    return syncResult
  }, [])

  /**
   * Save placeholders with cleared sync status
   * Waits for database confirmation before returning
   */
  const savePlaceholdersClean = useCallback(async (templateId: string, placeholders: Placeholder[]) => {
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    try {
      await store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
    } catch (error) {
      console.error('Failed to save placeholders:', error)
      throw error // Propagate error to caller for UI handling
    }
  }, [])

  return {
    templates,
    isLoading,
    addTemplate,
    updateTemplate,
    removeTemplate,
    getTemplate,
    updatePlaceholders,
    updateTemplateFile,
    savePlaceholdersClean,
  }
}
