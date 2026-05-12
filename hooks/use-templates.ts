'use client'

import { useSyncExternalStore, useCallback } from 'react'
import * as store from '@/lib/template-store'
import { Template, Placeholder } from '@/types'
import mammoth from 'mammoth'
import { detectPlaceholders } from '@/lib/placeholder-utils'

export function useTemplates() {
  const templates = useSyncExternalStore(
    store.subscribe,
    store.getTemplates,
    store.getTemplates
  )

  const addTemplate = useCallback(async (file: File) => {
    const fileContent = await file.arrayBuffer()
    
    // Extract text from DOCX to detect placeholders
    const result = await mammoth.extractRawText({ arrayBuffer: fileContent })
    const placeholders = detectPlaceholders(result.value)

    const template: Template = {
      id: crypto.randomUUID(),
      name: file.name,
      file,
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
    store.updateTemplate(templateId, { placeholders })
  }, [])

  return {
    templates,
    addTemplate,
    updateTemplate,
    removeTemplate,
    getTemplate,
    updatePlaceholders,
  }
}
