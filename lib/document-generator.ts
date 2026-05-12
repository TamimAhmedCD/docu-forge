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

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Render with data
  doc.render(data)

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

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Render with data
  doc.render(data)

  // Get the rendered document text
  const renderedZip = doc.getZip()
  const renderedBlob = renderedZip.generate({ type: 'arraybuffer' })
  
  // Extract text from rendered DOCX using mammoth
  const mammoth = await import('mammoth')
  const { value: renderedText } = await mammoth.default.extractRawText({ arrayBuffer: renderedBlob })

  // Create PDF with the actual document content
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 612
  const pageHeight = 792
  const margin = 50
  const maxWidth = pageWidth - (margin * 2)
  const lineHeight = 14
  const fontSize = 11

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let yPosition = pageHeight - margin

  // Title
  currentPage.drawText(template.name.replace(/\.[^/.]+$/, ''), {
    x: margin,
    y: yPosition,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  yPosition -= 30

  // Split text into lines and paragraphs
  const paragraphs = renderedText.split('\n')
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      yPosition -= lineHeight
      continue
    }

    // Word wrap
    const words = paragraph.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      
      if (textWidth > maxWidth && currentLine) {
        // Check if we need a new page
        if (yPosition < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight])
          yPosition = pageHeight - margin
        }
        
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        })
        yPosition -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    
    // Draw remaining text
    if (currentLine) {
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }
      
      currentPage.drawText(currentLine, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
      })
      yPosition -= lineHeight
    }
    
    // Add paragraph spacing
    yPosition -= 4
  }

  // Footer on last page
  currentPage.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
    x: margin,
    y: 30,
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
