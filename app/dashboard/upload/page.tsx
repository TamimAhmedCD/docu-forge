'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Check, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTemplates } from '@/hooks/use-templates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface UploadedFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  templateId?: string
  uniqueId?: string
}

export default function UploadPage() {
  const { addTemplate } = useTemplates()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return
    
    // Create unique IDs for tracking
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      file,
      status: 'pending' as const,
      uniqueId: `${file.name}-${Date.now()}-${Math.random()}`,
    }))
    
    setFiles((prev) => [...prev, ...uploadedFiles])
    
    // Process files immediately
    let successCount = 0
    
    for (const uploadedFile of uploadedFiles) {
      // Update to uploading status
      setFiles((prev) =>
        prev.map((f) =>
          f.uniqueId === uploadedFile.uniqueId
            ? { ...f, status: 'uploading' as const }
            : f
        )
      )

      try {
        const template = await addTemplate(uploadedFile.file)
        setFiles((prev) =>
          prev.map((f) =>
            f.uniqueId === uploadedFile.uniqueId
              ? { ...f, status: 'success' as const, templateId: template.id }
              : f
          )
        )
        successCount++
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.uniqueId === uploadedFile.uniqueId
              ? { ...f, status: 'error' as const, error: 'Failed to process file' }
              : f
          )
        )
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} template${successCount > 1 ? 's' : ''} uploaded successfully`)
    }
  }, [addTemplate])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.name.endsWith('.docx') || file.name.endsWith('.doc')
    )
    processFiles(droppedFiles)
  }, [processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.name.endsWith('.docx') || file.name.endsWith('.doc')
      )
      processFiles(selectedFiles)
    }
  }, [processFiles])

  const allProcessed = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error')
  const hasSuccess = files.some((f) => f.status === 'success')
  const isProcessing = files.some((f) => f.status === 'uploading')

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Upload Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Upload DOCX files with placeholders like {"{{name}}"} or [NAME]
        </p>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50'
          )}
        >
          <input
            type="file"
            accept=".doc,.docx"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Drop your templates here
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Supports .doc and .docx files
          </p>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Files ({files.length})
              </h2>
              {isProcessing && (
                <span className="text-sm text-muted-foreground">Processing...</span>
              )}
            </div>

            <div className="space-y-2">
              {files.map((file, index) => (
                <motion.div
                  key={`${file.file.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {file.file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(file.status === 'pending' || file.status === 'uploading') && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                    {file.status === 'success' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="text-sm text-destructive">{file.error}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {allProcessed && hasSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-semibold text-foreground">All done!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your templates are ready to use
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/dashboard/templates">
                    <Button variant="outline">View Templates</Button>
                  </Link>
                  <Link href="/dashboard/generate">
                    <Button>
                      Generate Documents
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
