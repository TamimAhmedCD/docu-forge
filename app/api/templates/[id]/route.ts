import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { TemplateDocument } from '../route'

type RouteContext = { params: Promise<{ id: string }> }

// GET - Fetch a single template
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const db = await getDatabase()
    
    const template = await db
      .collection<TemplateDocument>('templates')
      .findOne({ id })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      fileContent: template.fileContent,
      placeholders: template.placeholders,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, fileContent, placeholders } = body

    const db = await getDatabase()
    const now = new Date()

    const updateData: Partial<TemplateDocument> = {
      updatedAt: now,
    }

    if (name !== undefined) updateData.name = name
    if (fileContent !== undefined) updateData.fileContent = fileContent
    if (placeholders !== undefined) updateData.placeholders = placeholders

    const result = await db
      .collection<TemplateDocument>('templates')
      .findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )

    if (!result) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: result.id,
      name: result.name,
      placeholders: result.placeholders,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const db = await getDatabase()

    const result = await db
      .collection<TemplateDocument>('templates')
      .deleteOne({ id })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Also delete associated section config
    await db.collection('sectionConfigs').deleteMany({ templateKey: { $regex: id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
