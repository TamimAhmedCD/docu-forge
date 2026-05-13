'use client'

import { Placeholder, PlaceholderSyncStatus } from '@/types'
import { cn } from '@/lib/utils'
import { CheckCircle2, Plus, Minus, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

interface PlaceholderSyncPanelProps {
  placeholders: Placeholder[]
  removedPlaceholders: Placeholder[]
  syncedCount: number
  newCount: number
  removedCount: number
  className?: string
}

const statusConfig: Record<PlaceholderSyncStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  synced: {
    label: 'Synced',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  new: {
    label: 'New',
    icon: Plus,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  removed: {
    label: 'Removed',
    icon: Minus,
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  modified: {
    label: 'Modified',
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
}

export function PlaceholderSyncPanel({
  placeholders,
  removedPlaceholders,
  syncedCount,
  newCount,
  removedCount,
  className,
}: PlaceholderSyncPanelProps) {
  const hasChanges = newCount > 0 || removedCount > 0
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">{syncedCount} Synced</span>
        </div>
        {newCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">{newCount} New</span>
          </div>
        )}
        {removedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Minus className="h-4 w-4 text-red-600" />
            <span className="text-muted-foreground">{removedCount} Removed</span>
          </div>
        )}
      </div>

      {/* Alert for changes */}
      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Template Changes Detected</AlertTitle>
          <AlertDescription>
            {newCount > 0 && `${newCount} new placeholder${newCount > 1 ? 's' : ''} added. `}
            {removedCount > 0 && `${removedCount} placeholder${removedCount > 1 ? 's' : ''} removed from template.`}
            {' '}Your existing form data has been preserved.
          </AlertDescription>
        </Alert>
      )}

      {/* Placeholder Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Placeholder</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {placeholders.map((placeholder) => {
              const status = placeholder.syncStatus || 'synced'
              const config = statusConfig[status]
              const Icon = config.icon
              
              return (
                <tr 
                  key={placeholder.id}
                  className={cn(
                    'transition-colors',
                    status === 'new' && 'bg-blue-500/5',
                  )}
                >
                  <td className="px-4 py-2">
                    <div>
                      <span className="font-medium text-foreground">{placeholder.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {`{{${placeholder.name}}}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={cn('gap-1', config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
            
            {/* Show removed placeholders */}
            {removedPlaceholders.map((placeholder) => {
              const config = statusConfig.removed
              const Icon = config.icon
              
              return (
                <tr 
                  key={placeholder.id}
                  className="bg-red-500/5 text-muted-foreground"
                >
                  <td className="px-4 py-2">
                    <div>
                      <span className="font-medium line-through">{placeholder.label}</span>
                      <span className="ml-2 text-xs">
                        {`{{${placeholder.name}}}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={cn('gap-1', config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
