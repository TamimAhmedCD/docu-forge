'use client'

import { useSyncExternalStore, useCallback } from 'react'
import * as store from '@/lib/template-store'
import { Template, Placeholder, PlaceholderSyncResult } from '@/types'
import mammoth from 'mammoth'
import { detectPlaceholders } from '@/lib/placeholder-utils'
import { syncPlaceholders, clearSyncStatus } from '@/lib/placeholder-sync'

export function useTemplates() {
  const templates = useSyncExternalStore(
    store.subscribe,
    store.getTemplates,
    store.getServerTemplates // Use server snapshot for SSR
  )

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

    store.addTemplate(template)
    return template
  }, [])

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    store.updateTemplate(id, updates)
  }, [])

  const removeTemplate = useCallback((id: string) => {
    store.removeTemplate(id)
  }, [])

  const getTemplate = useCallback((id: string) => {
    return store.getTemplate(id)
  }, [])

  const updatePlaceholders = useCallback((templateId: string, placeholders: Placeholder[]) => {
    // Clear sync status before saving
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
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
    store.updateTemplate(templateId, {
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
  const savePlaceholdersClean = useCallback((templateId: string, placeholders: Placeholder[]) => {
    const cleanedPlaceholders = clearSyncStatus(placeholders)
    store.updateTemplate(templateId, { placeholders: cleanedPlaceholders })
  }, [])

  return {
    templates,
    addTemplate,
    updateTemplate,
    removeTemplate,
    getTemplate,
    updatePlaceholders,
    updateTemplateFile,
    savePlaceholdersClean,
  }
}
