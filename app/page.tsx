'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, Zap, Download, Layers, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: FileText,
    title: 'Upload DOCX Templates',
    description: 'Drag and drop your Word documents. Support for multiple templates at once.',
  },
  {
    icon: Zap,
    title: 'Auto-Detect Placeholders',
    description: 'Automatically finds {{name}} and [NAME] style placeholders in your documents.',
  },
  {
    icon: Layers,
    title: 'Dynamic Form Generation',
    description: 'Generates smart forms based on detected placeholders with proper field types.',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description: 'Download as DOCX or PDF. Generate multiple documents from one form.',
  },
]

const useCases = [
  'Certificates',
  'Office Letters',
  'Admission Forms',
  'Agreements',
  'Receipts',
  'Invoices',
  'Student Forms',
  'Contracts',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">DocuForge</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Document Automation
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Generate Documents
              <br />
              <span className="text-muted-foreground">in Seconds</span>
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              Stop manually editing the same documents over and over. Upload your templates, 
              fill a form once, and generate perfectly formatted documents instantly.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg" className="min-w-[200px]">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/templates">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  View Templates
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-4 text-muted-foreground">
              A complete toolkit for document automation
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-muted-foreground/50 hover:shadow-lg hover:shadow-black/5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold text-foreground">Perfect For</h2>
            <p className="mt-4 text-muted-foreground">
              Automate any document that needs frequent updates
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {useCases.map((useCase) => (
              <div
                key={useCase}
                className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
                {useCase}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-4 text-muted-foreground">Three simple steps to automated documents</p>
          </motion.div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Upload Templates',
                description: 'Upload your DOCX files with placeholders like {{name}} or [DATE]',
              },
              {
                step: '02',
                title: 'Fill the Form',
                description: 'Fill out the auto-generated form with your data',
              },
              {
                step: '03',
                title: 'Download Documents',
                description: 'Get your completed documents as DOCX or PDF instantly',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative rounded-xl border border-border bg-card p-8"
              >
                <div className="mb-4 text-4xl font-bold text-muted-foreground/30">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-12 text-center lg:p-16"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/50 to-transparent" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
                Ready to Automate Your Documents?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Start generating documents in seconds. No signup required.
              </p>
              <div className="mt-8">
                <Link href="/dashboard">
                  <Button size="lg">
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <FileText className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">DocuForge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered document generation for developers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
