import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export interface TemplateDocument {
  _id?: ObjectId
  id: string
  name: string
  fileContent: string // Base64 encoded
  placeholders: Array<{
    id: string
    name: string
    type: string
    label: string
    required: boolean
    options?: string[]
    defaultValue?: string
    width?: string
  }>
  createdAt: Date
  updatedAt: Date
}

// GET - Fetch all templates
export async function GET() {
  try {
    const db = await getDatabase()
    const templates = await db
      .collection<TemplateDocument>('templates')
      .find({})
      .sort({ updatedAt: -1 })
      .toArray()

    // Convert MongoDB documents to client format
    const clientTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      fileContent: t.fileContent,
      placeholders: t.placeholders,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return NextResponse.json(clientTemplates)
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, fileContent, placeholders } = body

    if (!id || !name || !fileContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const now = new Date()

    const template: TemplateDocument = {
      id,
      name,
      fileContent,
      placeholders: placeholders || [],
      createdAt: now,
      updatedAt: now,
    }

    await db.collection<TemplateDocument>('templates').insertOne(template)

    return NextResponse.json({
      id: template.id,
      name: template.name,
      placeholders: template.placeholders,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
