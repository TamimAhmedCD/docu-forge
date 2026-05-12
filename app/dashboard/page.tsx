'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, Upload, FileOutput, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTemplates } from '@/hooks/use-templates'
import { TemplateCard } from '@/components/template-card'

export default function DashboardPage() {
  const { templates } = useTemplates()

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your templates and generate documents
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Link href="/dashboard/upload">
          <div className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-muted-foreground/50 hover:shadow-lg hover:shadow-black/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Upload className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Upload Template</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Add new DOCX templates</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link href="/dashboard/templates">
          <div className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-muted-foreground/50 hover:shadow-lg hover:shadow-black/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">View Templates</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{templates.length} templates</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link href="/dashboard/generate">
          <div className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-muted-foreground/50 hover:shadow-lg hover:shadow-black/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <FileOutput className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Generate Documents</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Create from templates</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </motion.div>

      {/* Recent Templates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Templates</h2>
          {templates.length > 0 && (
            <Link href="/dashboard/templates">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {templates.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No templates yet</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Upload your first DOCX template to get started
            </p>
            <Link href="/dashboard/upload" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Template
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.slice(0, 6).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <TemplateCard template={template} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
