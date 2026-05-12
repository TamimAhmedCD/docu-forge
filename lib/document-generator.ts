import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Template, GeneratedDocument, FormData } from '@/types'

export async function generateDocx(
  template: Template,
  formData: FormData
): Promise<GeneratedDocument> {
  const zip = new PizZip(template.fileContent)
  
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Create data object with both formats
  const data: Record<string, string> = {}
  template.placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    const stringValue = value instanceof Date 
      ? value.toLocaleDateString() 
      : String(value || '')
    
    // Set value for both placeholder name formats
    data[placeholder.name] = stringValue
    data[placeholder.name.toUpperCase()] = stringValue
    data[placeholder.name.toLowerCase()] = stringValue
  })

  doc.setData(data)
  doc.render()

  const output = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const fileName = `${template.name.replace(/\.[^/.]+$/, '')}_generated.docx`

  return {
    id: crypto.randomUUID(),
    templateId: template.id,
    templateName: template.name,
    fileName,
    blob: output,
    type: 'docx',
    generatedAt: new Date(),
  }
}

export async function generatePdf(
  template: Template,
  formData: FormData
): Promise<GeneratedDocument> {
  // First generate the DOCX with replaced content
  const zip = new PizZip(template.fileContent)
  
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  const data: Record<string, string> = {}
  template.placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    const stringValue = value instanceof Date 
      ? value.toLocaleDateString() 
      : String(value || '')
    
    data[placeholder.name] = stringValue
    data[placeholder.name.toUpperCase()] = stringValue
    data[placeholder.name.toLowerCase()] = stringValue
  })

  doc.setData(data)
  doc.render()

  // For PDF, we'll create a simple text-based PDF
  // Note: Full DOCX to PDF conversion requires server-side processing
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 50
  let yPosition = height - margin

  // Title
  page.drawText(template.name.replace(/\.[^/.]+$/, ''), {
    x: margin,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  yPosition -= 40

  // Generated content
  page.drawText('Generated Document', {
    x: margin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  })
  yPosition -= 30

  // Form data
  template.placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    const stringValue = value instanceof Date 
      ? value.toLocaleDateString() 
      : String(value || '')

    if (yPosition < margin + 40) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792])
      yPosition = height - margin
    }

    page.drawText(`${placeholder.label}:`, {
      x: margin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 15

    page.drawText(stringValue || 'N/A', {
      x: margin,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    })
    yPosition -= 25
  })

  // Footer
  page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
    x: margin,
    y: margin,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const fileName = `${template.name.replace(/\.[^/.]+$/, '')}_generated.pdf`

  return {
    id: crypto.randomUUID(),
    templateId: template.id,
    templateName: template.name,
    fileName,
    blob,
    type: 'pdf',
    generatedAt: new Date(),
  }
}

export function downloadDocument(doc: GeneratedDocument, customFileName?: string): void {
  saveAs(doc.blob, customFileName || doc.fileName)
}

export async function generateBulkDocuments(
  templates: Template[],
  formData: FormData,
  outputType: 'docx' | 'pdf' = 'docx'
): Promise<GeneratedDocument[]> {
  const generator = outputType === 'pdf' ? generatePdf : generateDocx
  const documents = await Promise.all(
    templates.map(template => generator(template, formData))
  )
  return documents
}
