import { Template, GeneratedDocument } from '@/types'
import { deleteTemplateFormData } from '@/hooks/use-form-storage'

// In-memory store for templates and generated documents
// Using stable references for useSyncExternalStore compatibility
let templates: Template[] = []
let generatedDocuments: GeneratedDocument[] = []
let listeners: Set<() => void> = new Set()
let isInitialized = false
let initPromise: Promise<void> | null = null

// Server snapshot for SSR - empty array with stable reference
const emptyTemplates: Template[] = []
const emptyDocuments: GeneratedDocument[] = []

function notifyListeners() {
  listeners.forEach(listener => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Returns stable reference - the array itself, not a copy
export function getTemplates(): Template[] {
  return templates
}

// Server snapshot returns empty array with stable reference
export function getServerTemplates(): Template[] {
  return emptyTemplates
}

export function getTemplate(id: string): Template | undefined {
  return templates.find(t => t.id === id)
}

export function isStoreInitialized(): boolean {
  return isInitialized
}

// Initialize from MongoDB
export async function initializeFromDatabase(): Promise<void> {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        templates = data.map((t: any) => ({
          ...t,
          // Reconstruct File-like object from base64
          fileContent: t.fileContent 
            ? Uint8Array.from(atob(t.fileContent), c => c.charCodeAt(0)).buffer
            : null,
          file: null, // File object can't be reconstructed, will be created when needed
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }))
        notifyListeners()
      }
    } catch (error) {
      console.error('Failed to initialize from MongoDB:', error)
    } finally {
      isInitialized = true
    }
  })()

  return initPromise
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function addTemplate(template: Template): Promise<void> {
  // Add to local state immediately for UI responsiveness
  templates = [...templates, template]
  notifyListeners()

  // Persist to MongoDB
  try {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: template.id,
        name: template.name,
        fileContent: template.fileContent ? arrayBufferToBase64(template.fileContent) : '',
        placeholders: template.placeholders,
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to save template to MongoDB')
    }
  } catch (error) {
    console.error('Failed to save template to MongoDB:', error)
  }
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<void> {
  // Update local state immediately
  templates = templates.map(t => 
    t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
  )
  notifyListeners()

  // Persist to MongoDB
  try {
    const updateData: Record<string, any> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.placeholders !== undefined) updateData.placeholders = updates.placeholders
    if (updates.fileContent !== undefined) {
      updateData.fileContent = arrayBufferToBase64(updates.fileContent)
    }

    const response = await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      console.error('Failed to update template in MongoDB')
    }
  } catch (error) {
    console.error('Failed to update template in MongoDB:', error)
  }
}

export async function removeTemplate(id: string): Promise<void> {
  // Remove from local state immediately
  templates = templates.filter(t => t.id !== id)
  notifyListeners()

  // Delete localStorage form data for this template
  deleteTemplateFormData(id)

  // Remove from MongoDB (cascade deletes section configs on server)
  try {
    const response = await fetch(`/api/templates/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      console.error('Failed to delete template from MongoDB')
    }
  } catch (error) {
    console.error('Failed to delete template from MongoDB:', error)
  }
}

// Returns stable reference
export function getGeneratedDocuments(): GeneratedDocument[] {
  return generatedDocuments
}

// Server snapshot returns empty array with stable reference
export function getServerGeneratedDocuments(): GeneratedDocument[] {
  return emptyDocuments
}

export function addGeneratedDocument(doc: GeneratedDocument): void {
  generatedDocuments = [...generatedDocuments, doc]
  notifyListeners()
  // Generated documents are kept in memory only (they contain Blob objects)
}

export function clearGeneratedDocuments(): void {
  generatedDocuments = []
  notifyListeners()
}
