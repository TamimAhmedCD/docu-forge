import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { FormSection, FieldGroup } from '@/types'

export interface SectionConfigDocument {
  templateKey: string // Composite key of sorted template IDs
  sections: FormSection[]
  isAutoGrouped: boolean
  lastModified: Date
}

// GET - Fetch section config by template key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateKey = searchParams.get('templateKey')

    if (!templateKey) {
      return NextResponse.json(
        { error: 'templateKey is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const config = await db
      .collection<SectionConfigDocument>('sectionConfigs')
      .findOne({ templateKey })

    if (!config) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      templateKey: config.templateKey,
      sections: config.sections,
      isAutoGrouped: config.isAutoGrouped,
      lastModified: config.lastModified.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch section config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch section config' },
      { status: 500 }
    )
  }
}

// POST/PUT - Save section config (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateKey, sections, isAutoGrouped } = body

    if (!templateKey) {
      return NextResponse.json(
        { error: 'templateKey is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const now = new Date()

    const configData: SectionConfigDocument = {
      templateKey,
      sections: sections || [],
      isAutoGrouped: isAutoGrouped ?? true,
      lastModified: now,
    }

    await db
      .collection<SectionConfigDocument>('sectionConfigs')
      .updateOne(
        { templateKey },
        { $set: configData },
        { upsert: true }
      )

    return NextResponse.json({
      templateKey: configData.templateKey,
      sections: configData.sections,
      isAutoGrouped: configData.isAutoGrouped,
      lastModified: configData.lastModified.toISOString(),
    })
  } catch (error) {
    console.error('Failed to save section config:', error)
    return NextResponse.json(
      { error: 'Failed to save section config' },
      { status: 500 }
    )
  }
}

// DELETE - Delete section config
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateKey = searchParams.get('templateKey')

    if (!templateKey) {
      return NextResponse.json(
        { error: 'templateKey is required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    await db.collection('sectionConfigs').deleteOne({ templateKey })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete section config:', error)
    return NextResponse.json(
      { error: 'Failed to delete section config' },
      { status: 500 }
    )
  }
}
