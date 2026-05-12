'use client'

import { Template, GeneratedDocument } from '@/types'

// In-memory store for templates and generated documents
let templates: Template[] = []
let generatedDocuments: GeneratedDocument[] = []
let listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach(listener => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTemplates(): Template[] {
  return [...templates]
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

export function getGeneratedDocuments(): GeneratedDocument[] {
  return [...generatedDocuments]
}

export function addGeneratedDocument(doc: GeneratedDocument): void {
  generatedDocuments = [...generatedDocuments, doc]
  notifyListeners()
}

export function clearGeneratedDocuments(): void {
  generatedDocuments = []
  notifyListeners()
}
