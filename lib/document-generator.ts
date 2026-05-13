import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import { Template, GeneratedDocument, FormData } from '@/types'
import { formatDateDDMMYYYY } from '@/lib/date-formatter'

// Extract all text from <w:t> tags within a paragraph, preserving positions
function extractTextWithPositions(xml: string): { text: string; segments: Array<{ start: number; end: number; tagStart: number; tagEnd: number }> } {
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let text = ''
  const segments: Array<{ start: number; end: number; tagStart: number; tagEnd: number }> = []
  
  while ((match = textRegex.exec(xml)) !== null) {
    const content = match[1]
    segments.push({
      start: text.length,
      end: text.length + content.length,
      tagStart: match.index,
      tagEnd: match.index + match[0].length
    })
    text += content
  }
  
  return { text, segments }
}

// Replace placeholders in XML by working with the extracted text
function replacePlaceholdersInXml(
  xmlContent: string,
  placeholders: Template['placeholders'],
  formData: FormData
): string {
  console.log('[v0] Starting placeholder replacement')
  console.log('[v0] Placeholders:', placeholders.map(p => ({ id: p.id, name: p.name })))
  console.log('[v0] Form data keys:', Object.keys(formData))

  // First approach: simple text replacement within <w:t> tags
  let result = xmlContent
  
  placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    console.log('[v0] Processing placeholder:', placeholder.name, 'id:', placeholder.id, 'value:', value)
    
    // Format dates as DD/MM/YYYY
    const stringValue = value instanceof Date 
      ? formatDateDDMMYYYY(value) 
      : typeof value === 'string' && placeholder.type === 'date' && value
        ? formatDateDDMMYYYY(new Date(value))
        : String(value || '')
    
    // Escape XML special characters
    const escapedValue = stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    // Try multiple placeholder formats
    const patterns = [
      // Exact {{name}} format
      new RegExp(`\\{\\{\\s*${escapeRegexString(placeholder.name)}\\s*\\}\\}`, 'gi'),
      // [NAME] format
      new RegExp(`\\[${escapeRegexString(placeholder.name)}\\]`, 'gi'),
      // {name} single brace format (some templates use this)
      new RegExp(`\\{${escapeRegexString(placeholder.name)}\\}`, 'gi'),
    ]

    patterns.forEach((pattern, idx) => {
      const matches = result.match(pattern)
      if (matches && matches.length > 0) {
        console.log('[v0] Pattern', idx, 'found', matches.length, 'matches for', placeholder.name)
        result = result.replace(pattern, escapedValue)
      }
    })
  })

  // Second approach: handle Word's text splitting where {{ and name and }} are in separate <w:t> tags
  // We need to find and reconstruct split placeholders
  placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    // Format dates as DD/MM/YYYY
    const stringValue = value instanceof Date 
      ? formatDateDDMMYYYY(value) 
      : typeof value === 'string' && placeholder.type === 'date' && value
        ? formatDateDDMMYYYY(new Date(value))
        : String(value || '')
    
    const escapedValue = stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    // Pattern to match placeholders split across XML tags
    // This handles: <w:t>{{</w:t>...<w:t>name</w:t>...<w:t>}}</w:t>
    // We match opening braces, then content with any XML in between, then closing braces
    const splitPatterns = [
      // {{ split from name split from }}
      new RegExp(
        `(\\{)(<\\/w:t>(?:<[^>]*>)*<w:t[^>]*>)?(\\{)(<\\/w:t>(?:<[^>]*>)*<w:t[^>]*>)?\\s*(${escapeRegexString(placeholder.name)})\\s*(<\\/w:t>(?:<[^>]*>)*<w:t[^>]*>)?(\\})(<\\/w:t>(?:<[^>]*>)*<w:t[^>]*>)?(\\})`,
        'gi'
      ),
    ]

    splitPatterns.forEach((pattern, idx) => {
      const matches = result.match(pattern)
      if (matches && matches.length > 0) {
        console.log('[v0] Split pattern', idx, 'found', matches.length, 'matches for', placeholder.name)
        result = result.replace(pattern, escapedValue)
      }
    })
  })

  return result
}

function escapeRegexString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function generateDocx(
  template: Template,
  formData: FormData
): Promise<GeneratedDocument> {
  console.log('[v0] generateDocx called')
  console.log('[v0] Template:', template.name)
  console.log('[v0] Template placeholders:', template.placeholders)
  console.log('[v0] Form data received:', formData)
  
  const zip = new PizZip(template.fileContent)
  
  // Get the document.xml content
  const documentXml = zip.file('word/document.xml')
  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing document.xml')
  }
  
  let xmlContent = documentXml.asText()
  
  // Log a sample of the XML to see placeholder format
  console.log('[v0] XML sample (first 2000 chars):', xmlContent.substring(0, 2000))
  
  // Replace placeholders in the XML
  xmlContent = replacePlaceholdersInXml(xmlContent, template.placeholders, formData)
  
  console.log('[v0] XML after replacement (first 2000 chars):', xmlContent.substring(0, 2000))
  
  // Update the zip with modified content
  zip.file('word/document.xml', xmlContent)
  
  // Also check and replace in headers/footers if they exist
  const headerFiles = ['word/header1.xml', 'word/header2.xml', 'word/header3.xml']
  const footerFiles = ['word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml']
  
  for (const fileName of [...headerFiles, ...footerFiles]) {
    const file = zip.file(fileName)
    if (file) {
      let content = file.asText()
      content = replacePlaceholdersInXml(content, template.placeholders, formData)
      zip.file(fileName, content)
    }
  }

  const output = zip.generate({
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
  // Generate DOCX first with placeholders replaced (preserving all formatting)
  const docResult = await generateDocx(template, formData)
  
  // Note: True DOCX to PDF conversion with full formatting requires server-side tools
  // For now, we generate the DOCX but save as PDF-compatible format
  // The best option for users who need PDF is to download DOCX and use Word/LibreOffice to convert
  
  // Return the DOCX blob but indicate it's meant for PDF
  // The user should be informed that DOCX download preserves formatting better
  const fileName = `${template.name.replace(/\.[^/.]+$/, '')}_generated.pdf`

  // For a basic PDF, we'll extract the content and create a simple PDF
  // This won't preserve complex formatting but will show the replaced content
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
  const mammoth = await import('mammoth')
  
  // Convert the generated DOCX blob to arraybuffer
  const arrayBuffer = await docResult.blob.arrayBuffer()
  const { value: renderedText } = await mammoth.default.extractRawText({ arrayBuffer })

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 612
  const pageHeight = 792
  const margin = 50
  const maxWidth = pageWidth - (margin * 2)
  const lineHeight = 14
  const fontSize = 11

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let yPosition = pageHeight - margin

  // Split text into lines and paragraphs
  const paragraphs = renderedText.split('\n')
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      yPosition -= lineHeight / 2
      continue
    }

    // Word wrap
    const words = paragraph.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      
      if (textWidth > maxWidth && currentLine) {
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
    
    yPosition -= 2
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })

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
