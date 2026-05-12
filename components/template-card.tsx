'use client'

import Link from 'next/link'
import { FileText, MoreVertical, Edit2, Trash2, FileOutput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Template } from '@/types'
import { useTemplates } from '@/hooks/use-templates'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface TemplateCardProps {
  template: Template
}

export function TemplateCard({ template }: TemplateCardProps) {
  const { removeTemplate } = useTemplates()

  const handleDelete = () => {
    removeTemplate(template.id)
    toast.success('Template deleted')
  }

  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-muted-foreground/50 hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-foreground" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/templates/${template.id}`}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/generate?template=${template.id}`}>
                <FileOutput className="mr-2 h-4 w-4" />
                Generate
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-foreground line-clamp-1">
          {template.name.replace(/\.[^/.]+$/, '')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {template.placeholders.length} placeholder{template.placeholders.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(template.updatedAt, { addSuffix: true })}
        </span>
        <Link href={`/dashboard/generate?template=${template.id}`}>
          <Button size="sm" variant="secondary">
            Generate
          </Button>
        </Link>
      </div>
    </div>
  )
}
