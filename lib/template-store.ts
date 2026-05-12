import { Template, GeneratedDocument } from '@/types'

// In-memory store for templates and generated documents
// Using stable references for useSyncExternalStore compatibility
let templates: Template[] = []
let generatedDocuments: GeneratedDocument[] = []
let listeners: Set<() => void> = new Set()

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

export function addTemplate(template: Template): void {
  templates = [...templates, template]
  notifyListeners()
}

export function updateTemplate(id: string, updates: Partial<Template>): void {
  templates = templates.map(t => 
    t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
  )
  notifyListeners()
}

export function removeTemplate(id: string): void {
  templates = templates.filter(t => t.id !== id)
  notifyListeners()
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
}

export function clearGeneratedDocuments(): void {
  generatedDocuments = []
  notifyListeners()
}
