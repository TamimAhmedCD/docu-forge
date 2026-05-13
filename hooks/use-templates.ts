'use client'

import { useSyncExternalStore, useCallback, useEffect, useState } from 'react'
import * as store from '@/lib/template-store'
import { Template, Placeholder, PlaceholderSyncResult } from '@/types'
import mammoth from 'mammoth'
import { detectPlaceholders } from '@/lib/placeholder-utils'
import { syncPlaceholders, clearSyncStatus } from '@/lib/placeholder-sync'

export function useTemplates() {
  const [isLoading, setIsLoading] = useState(!store.isStoreInitialized())
  
  const templates = useSyncExternalStore(
    store.subscribe,
    store.getTemplates,
    store.getServerTemplates // Use server snapshot for SSR
  )

  // Initialize from MongoDB on mount
  useEffect(() => {
    if (!store.isStoreInitialized()) {
      store.initializeFromDatabase().then(() => {
        setIsLoading(false)
      })
    }
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
    await store.removeTemplate(id)
  }, [])

  const getTemplate = useCallback((id: string) => {
    return store.getTemplate(id)
  }, [])

  const updatePlaceholders = useCallback(async (templateId: string, placeholders: Placeholder[]) => {
    // Clear sync status before saving
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    await store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
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
   */
  const savePlaceholdersClean = useCallback(async (templateId: string, placeholders: Placeholder[]) => {
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    await store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
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
