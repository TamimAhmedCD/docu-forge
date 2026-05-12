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
import { Template, FormData as FormDataType, GeneratedDocument } from '@/types'
import { generateDocx, generatePdf, downloadDocument } from '@/lib/document-generator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import mammoth from 'mammoth'

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')
  const { templates } = useTemplates()
  
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [formData, setFormData] = useState<FormDataType>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>('docx')
  const [showPreview, setShowPreview] = useState(false)
  const [documentTexts, setDocumentTexts] = useState<Record<string, string>>({})
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (templateId && templates.find(t => t.id === templateId)) {
      setSelectedTemplates([templateId])
    }
  }, [templateId, templates])

  // Extract document text when templates are selected
  useEffect(() => {
    const extractTexts = async () => {
      for (const id of selectedTemplates) {
        if (documentTexts[id]) continue
        const template = templates.find(t => t.id === id)
        if (template?.fileContent) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: template.fileContent })
            setDocumentTexts(prev => ({ ...prev, [id]: result.value }))
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
    extractTexts()
  }, [selectedTemplates, templates, documentTexts, previewTemplate])

  // Generate preview text with placeholders replaced
  const previewText = useMemo(() => {
    if (!previewTemplate || !documentTexts[previewTemplate]) return ''
    
    let text = documentTexts[previewTemplate]
    const template = templates.find(t => t.id === previewTemplate)
    
    if (template) {
      template.placeholders.forEach(placeholder => {
        const value = formData[placeholder.id]
        const stringValue = value instanceof Date 
          ? value.toLocaleDateString() 
          : String(value || `[${placeholder.label}]`)
        
        // Replace all placeholder formats
        const patterns = [
          new RegExp(`\\{\\{${placeholder.name}\\}\\}`, 'gi'),
          new RegExp(`\\[${placeholder.name}\\]`, 'gi'),
        ]
        patterns.forEach(pattern => {
          text = text.replace(pattern, stringValue)
        })
      })
    }
    
    return text
  }, [previewTemplate, documentTexts, formData, templates])

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
    setFormData(prev => ({ ...prev, [id]: value }))
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
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Template Selection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-1"
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

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:col-span-2"
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
                    <Button
                      variant={showPreview ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                  </div>
                  <div className="max-h-[400px] overflow-auto p-4">
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
                      <div className="max-h-[400px] overflow-auto p-4">
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                            {previewText || 'Loading preview...'}
                          </pre>
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
