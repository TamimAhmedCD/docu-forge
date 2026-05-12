import { Template, GeneratedDocument } from '@/types'

// In-memory store for templates and generated documents
// Using stable references for useSyncExternalStore compatibility
let templates: Template[] = []
let generatedDocuments: GeneratedDocument[] = []
let listeners: Set<() => void> = new Set()

// Server snapshot for SSR - empty array with stable reference
const emptyTemplates: Template[] = []
const emptyDocuments: GeneratedDocument[] = []

const TEMPLATES_STORAGE_KEY = 'document-generator-templates'
const DOCUMENTS_STORAGE_KEY = 'document-generator-documents'

// Initialize from localStorage if available
function initializeFromStorage() {
  if (typeof window !== 'undefined') {
    try {
      const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      const storedDocuments = localStorage.getItem(DOCUMENTS_STORAGE_KEY)
      
      if (storedTemplates) {
        const parsed = JSON.parse(storedTemplates)
        templates = parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }))
      }
      
      if (storedDocuments) {
        const parsed = JSON.parse(storedDocuments)
        generatedDocuments = parsed.map((d: any) => ({
          ...d,
          generatedAt: new Date(d.generatedAt),
        }))
      }
    } catch (error) {
      console.error('Failed to initialize from localStorage:', error)
    }
  }
}

function saveToLocalStorage() {
  if (typeof window !== 'undefined') {
    try {
      // Store templates without File objects (convert fileContent to base64)
      const templatesData = templates.map(t => ({
        id: t.id,
        name: t.name,
        fileContent: t.fileContent ? Array.from(new Uint8Array(t.fileContent)).map(b => String.fromCharCode(b)).join('') : '',
        placeholders: t.placeholders,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
      
      const documentsData = generatedDocuments.map(d => ({
        id: d.id,
        templateId: d.templateId,
        templateName: d.templateName,
        fileName: d.fileName,
        type: d.type,
        generatedAt: d.generatedAt.toISOString(),
      }))
      
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templatesData))
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documentsData))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }
}

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

export function addTemplate(template: Template): void {
  templates = [...templates, template]
  notifyListeners()
  saveToLocalStorage()
}

export function updateTemplate(id: string, updates: Partial<Template>): void {
  templates = templates.map(t => 
    t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
  )
  notifyListeners()
  saveToLocalStorage()
}

export function removeTemplate(id: string): void {
  templates = templates.filter(t => t.id !== id)
  notifyListeners()
  saveToLocalStorage()
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
  saveToLocalStorage()
}

export function clearGeneratedDocuments(): void {
  generatedDocuments = []
  notifyListeners()
  saveToLocalStorage()
}

// Initialize storage on module load
initializeFromStorage()
