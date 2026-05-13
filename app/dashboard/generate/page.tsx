'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  FileOutput,
  Download,
  Check,
  Plus,
  Eye,
  Menu,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTemplates } from '@/hooks/use-templates'
import { useFormStorage } from '@/hooks/use-form-storage'
import { Template, FormData as FormDataType, GeneratedDocument } from '@/types'
import { generateDocx, generatePdf, downloadDocument } from '@/lib/document-generator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import mammoth from 'mammoth'
import { Trash2 } from 'lucide-react'

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')
  const { templates } = useTemplates()
  const { formData, updateFormData, clearFormData, isLoaded } = useFormStorage()
  
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>('docx')
  const [showPreview, setShowPreview] = useState(false)
  const [documentHtml, setDocumentHtml] = useState<Record<string, string>>({})
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (templateId && templates.find(t => t.id === templateId)) {
      setSelectedTemplates([templateId])
    }
  }, [templateId, templates])

  // Extract document HTML when templates are selected (for preview with formatting)
  useEffect(() => {
    const extractHtml = async () => {
      for (const id of selectedTemplates) {
        if (documentHtml[id]) continue
        const template = templates.find(t => t.id === id)
        if (template?.fileContent) {
          try {
            // Use convertToHtml to preserve formatting
            const result = await mammoth.convertToHtml({ arrayBuffer: template.fileContent })
            setDocumentHtml(prev => ({ ...prev, [id]: result.value }))
          } catch {
            // Ignore extraction errors
          }
        }
      }
      // Set first selected template as preview
      if (selectedTemplates.length > 0 && !previewTemplate) {
        setPreviewTemplate(selectedTemplates[0])
      }
    }
    extractHtml()
  }, [selectedTemplates, templates, documentHtml, previewTemplate])

  // Generate preview HTML with placeholders replaced
  const previewHtml = useMemo(() => {
    if (!previewTemplate || !documentHtml[previewTemplate]) return ''
    
    let html = documentHtml[previewTemplate]
    const template = templates.find(t => t.id === previewTemplate)
    
    if (template) {
      template.placeholders.forEach(placeholder => {
        const value = formData[placeholder.id]
        const displayValue = value instanceof Date 
          ? value.toLocaleDateString() 
          : String(value || '')
        
        // Show filled value or highlight unfilled placeholder
        const replacement = displayValue 
          ? `<span style="background-color: rgba(34, 197, 94, 0.2); padding: 0 2px; border-radius: 2px;">${displayValue}</span>`
          : `<span style="background-color: rgba(239, 68, 68, 0.2); padding: 0 2px; border-radius: 2px; color: #ef4444;">[${placeholder.label}]</span>`
        
        // Replace all placeholder formats in HTML
        const patterns = [
          new RegExp(`\\{\\{\\s*${placeholder.name}\\s*\\}\\}`, 'gi'),
          new RegExp(`\\[${placeholder.name}\\]`, 'gi'),
        ]
        patterns.forEach(pattern => {
          html = html.replace(pattern, replacement)
        })
      })
    }
    
    return html
  }, [previewTemplate, documentHtml, formData, templates])

  // Get all unique placeholders from selected templates
  const allPlaceholders = selectedTemplates.flatMap(id => {
    const template = templates.find(t => t.id === id)
    return template?.placeholders || []
  }).filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i)

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    )
  }

  const handleInputChange = (id: string, value: string | number | Date) => {
    updateFormData(id, value)
  }

  const handleClearForm = () => {
    clearFormData()
    toast.success('Form data cleared')
  }

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one template')
      return
    }

    // Validate required fields
    const missingFields = allPlaceholders
      .filter(p => p.required && !formData[p.id])
      .map(p => p.label)

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`)
      return
    }

    setIsGenerating(true)
    const docs: GeneratedDocument[] = []

    try {
      for (const templateId of selectedTemplates) {
        const template = templates.find(t => t.id === templateId)
        if (!template) continue

        const generator = outputFormat === 'pdf' ? generatePdf : generateDocx
        const doc = await generator(template, formData)
        docs.push(doc)
      }

      setGeneratedDocs(docs)
      toast.success(`Generated ${docs.length} document${docs.length > 1 ? 's' : ''}`)
    } catch (error) {
      toast.error('Failed to generate documents')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = (doc: GeneratedDocument) => {
    downloadDocument(doc)
    toast.success('Download started')
  }

  const handleDownloadAll = () => {
    generatedDocs.forEach(doc => downloadDocument(doc))
    toast.success('Downloads started')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Generate Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Fill the form once, generate multiple documents
        </p>
      </motion.div>

      {templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-8"
        >
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No templates available</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Upload templates first to generate documents
            </p>
            <Link href="/dashboard/upload" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Template
              </Button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="mt-8 flex gap-8">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed bottom-6 right-6 z-40 hidden lg:flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted cursor-pointer"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Template Selection Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: sidebarOpen ? 1 : 0, x: sidebarOpen ? 0 : -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex-shrink-0 w-full lg:w-80 transition-all duration-200",
              !sidebarOpen && "hidden lg:hidden"
            )}
          >
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="font-semibold text-foreground">Select Templates</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose one or more templates
                </p>
              </div>
              <div className="max-h-[400px] overflow-auto p-4">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-muted-foreground/50',
                        selectedTemplates.includes(template.id) && 'border-primary bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={selectedTemplates.includes(template.id)}
                        onCheckedChange={() => toggleTemplate(template.id)}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <FileText className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm">
                          {template.name.replace(/\.[^/.]+$/, '')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {template.placeholders.length} fields
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Output Format:</Label>
                  <Select value={outputFormat} onValueChange={(v: 'docx' | 'pdf') => setOutputFormat(v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {selectedTemplates.length === 0 ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileOutput className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Select templates to continue
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Choose at least one template from the list
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Form Card */}
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <h2 className="font-semibold text-foreground">Fill Form</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {allPlaceholders.length} field{allPlaceholders.length !== 1 ? 's' : ''} to fill
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearForm}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Form
                      </Button>
                      <Button
                        variant={showPreview ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto overflow-x-hidden p-4">
                    <div className="space-y-4">
                      {allPlaceholders.map((placeholder) => (
                        <div key={placeholder.id} className="space-y-2">
                          <Label htmlFor={placeholder.id}>
                            {placeholder.label}
                            {placeholder.required && (
                              <span className="ml-1 text-destructive">*</span>
                            )}
                          </Label>
                          {placeholder.type === 'textarea' ? (
                            <Textarea
                              id={placeholder.id}
                              value={(formData[placeholder.id] as string) || ''}
                              onChange={(e) => handleInputChange(placeholder.id, e.target.value)}
                              placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                              rows={3}
                            />
                          ) : placeholder.type === 'select' ? (
                            <Select
                              value={(formData[placeholder.id] as string) || ''}
                              onValueChange={(v) => handleInputChange(placeholder.id, v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${placeholder.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {placeholder.options?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={placeholder.id}
                              type={placeholder.type === 'number' ? 'number' : placeholder.type === 'date' ? 'date' : placeholder.type === 'email' ? 'email' : 'text'}
                              value={(formData[placeholder.id] as string) || ''}
                              onChange={(e) => handleInputChange(placeholder.id, e.target.value)}
                              placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-border p-4">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileOutput className="mr-2 h-4 w-4" />
                          Generate {selectedTemplates.length} Document{selectedTemplates.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Live Preview */}
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-border p-4">
                        <div>
                          <h2 className="font-semibold text-foreground">Live Preview</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            See how your document will look with filled values
                          </p>
                        </div>
                        {selectedTemplates.length > 1 && (
                          <Select
                            value={previewTemplate || ''}
                            onValueChange={(v) => setPreviewTemplate(v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedTemplates.map((id) => {
                                const t = templates.find(t => t.id === id)
                                return (
                                  <SelectItem key={id} value={id}>
                                    {t?.name.replace(/\.[^/.]+$/, '') || id}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="max-h-[500px] overflow-auto p-4">
                        <div className="rounded-lg border border-border bg-white p-6 text-black">
                          {previewHtml ? (
                            <div 
                              className="prose prose-sm max-w-none [&_p]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_img]:max-w-full"
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          ) : (
                            <p className="text-muted-foreground">Loading preview...</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Generated Documents */}
      <AnimatePresence>
        {generatedDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8"
          >
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h2 className="font-semibold text-foreground">Generated Documents</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {generatedDocs.length} document{generatedDocs.length > 1 ? 's' : ''} ready
                  </p>
                </div>
                {generatedDocs.length > 1 && (
                  <Button variant="outline" onClick={handleDownloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border">
                {generatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doc.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.type.toUpperCase()} · Generated just now
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleDownload(doc)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <GeneratePageContent />
    </Suspense>
  )
}
