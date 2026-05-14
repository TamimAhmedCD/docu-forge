import { Template, GeneratedDocument } from '@/types'
import { deleteTemplateFormData } from '@/hooks/use-form-storage'

// In-memory store for templates and generated documents
// Using stable references for useSyncExternalStore compatibility
let templates: Template[] = []
let generatedDocuments: GeneratedDocument[] = []
let listeners: Set<() => void> = new Set()
let isInitialized = false
let isLoading = true // Start as loading - becomes false when DB initialization completes
let initPromise: Promise<void> | null = null
let pendingSaves: Set<string> = new Set() // Track pending saves by template ID

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

export function isSavePending(id: string): boolean {
  return pendingSaves.has(id)
}

export function isStoreLoading(): boolean {
  return isLoading
}

// Initialize from MongoDB
// This is the ONLY place where templates are loaded from the database
// No default data is ever written or overwritten here
export async function initializeFromDatabase(): Promise<void> {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      isLoading = true
      notifyListeners() // Notify that loading started

      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        // Load data from MongoDB - NEVER apply defaults or seed data here
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
        console.log('[v0] Loaded templates from MongoDB:', templates.length)
        notifyListeners()
      } else {
        console.warn('[v0] Failed to load templates:', response.status)
      }
    } catch (error) {
      console.error('[v0] Failed to initialize from MongoDB:', error)
      // On error, templates remain empty - no fallback to defaults
    } finally {
      isInitialized = true
      isLoading = false
      notifyListeners() // Notify that loading completed
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
  // Mark save as pending
  pendingSaves.add(template.id)
  notifyListeners()

  try {
    // Persist to MongoDB FIRST
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
      throw new Error(`Failed to save template: ${response.statusText}`)
    }

    // Add to local state ONLY after DB confirms success
    templates = [...templates, template]
    notifyListeners()
  } catch (error) {
    console.error('Failed to save template to MongoDB:', error)
    throw error
  } finally {
    pendingSaves.delete(template.id)
    notifyListeners()
  }
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<void> {
  // Prevent concurrent saves
  if (pendingSaves.has(id)) {
    console.warn(`Save already in progress for template ${id}`)
    return
  }

  // Find existing template first (for error recovery)
  const existingTemplate = templates.find(t => t.id === id)
  if (!existingTemplate) {
    console.error(`Template ${id} not found`)
    return
  }

  // Mark save as pending
  pendingSaves.add(id)
  notifyListeners()

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
      throw new Error(`Failed to update template: ${response.statusText}`)
    }

    // Update local state ONLY after DB confirms success
    templates = templates.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    )
    notifyListeners()
  } catch (error) {
    console.error('Failed to update template in MongoDB:', error)
    // State remains unchanged (error recovery)
    notifyListeners()
    throw error
  } finally {
    pendingSaves.delete(id)
    notifyListeners()
  }
}

export async function removeTemplate(id: string): Promise<void> {
  // Find template first (for error recovery)
  const templateToRemove = templates.find(t => t.id === id)
  if (!templateToRemove) {
    console.error(`Template ${id} not found`)
    return
  }

  // Mark delete as pending
  pendingSaves.add(id)
  notifyListeners()

  try {
    // Remove from MongoDB FIRST (cascade deletes section configs on server)
    const response = await fetch(`/api/templates/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete template: ${response.statusText}`)
    }

    // Remove from local state ONLY after DB confirms success
    templates = templates.filter(t => t.id !== id)
    notifyListeners()

    // Delete localStorage form data for this template
    deleteTemplateFormData(id)
  } catch (error) {
    console.error('Failed to delete template from MongoDB:', error)
    throw error
  } finally {
    pendingSaves.delete(id)
    notifyListeners()
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
