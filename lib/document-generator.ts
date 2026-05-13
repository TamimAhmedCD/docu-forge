import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'
import { Template, GeneratedDocument, FormData } from '@/types'
import { formatDateDDMMYYYY } from '@/lib/date-formatter'

function escapeRegexString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Clean XML content by removing all tags and returning plain text positions
function getTextContent(xml: string): string {
  // Extract only text from <w:t> tags
  const textMatches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
  return textMatches.map(match => {
    const content = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    return content ? content[1] : ''
  }).join('')
}

// Advanced replacement that handles split placeholders across XML tags
function replacePlaceholdersInXml(
  xmlContent: string,
  placeholders: Template['placeholders'],
  formData: FormData
): string {
  let result = xmlContent

  placeholders.forEach(placeholder => {
    const value = formData[placeholder.id]
    
    // Format dates as DD-MM-YYYY
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

    const placeholderName = placeholder.name

    // Strategy 1: Direct replacement for placeholders that aren't split
    const directPatterns = [
      new RegExp(`\\{\\{\\s*${escapeRegexString(placeholderName)}\\s*\\}\\}`, 'gi'),
      new RegExp(`\\[${escapeRegexString(placeholderName)}\\]`, 'gi'),
      new RegExp(`\\{${escapeRegexString(placeholderName)}\\}`, 'gi'),
      new RegExp(`&lt;&lt;${escapeRegexString(placeholderName)}&gt;&gt;`, 'gi'),
      new RegExp(`<<${escapeRegexString(placeholderName)}>>`, 'gi'),
    ]

    directPatterns.forEach(pattern => {
      result = result.replace(pattern, escapedValue)
    })

    // Strategy 2: Handle placeholders split across multiple <w:t> tags
    // Build a regex that allows XML tags between each character of the placeholder
    const buildSplitPattern = (prefix: string, name: string, suffix: string) => {
      const xmlBetween = '(?:</w:t>(?:<[^>]*>)*<w:t[^>]*>)?'
      
      // Allow XML tags between prefix characters
      let patternStr = ''
      for (let i = 0; i < prefix.length; i++) {
        patternStr += escapeRegexString(prefix[i])
        if (i < prefix.length - 1) patternStr += xmlBetween
      }
      
      patternStr += xmlBetween + '\\s*'
      
      // Allow XML tags between name characters
      for (let i = 0; i < name.length; i++) {
        patternStr += escapeRegexString(name[i])
        if (i < name.length - 1) patternStr += xmlBetween
      }
      
      patternStr += '\\s*' + xmlBetween
      
      // Allow XML tags between suffix characters
      for (let i = 0; i < suffix.length; i++) {
        patternStr += escapeRegexString(suffix[i])
        if (i < suffix.length - 1) patternStr += xmlBetween
      }
      
      return new RegExp(patternStr, 'gi')
    }

    const splitPatterns = [
      buildSplitPattern('{{', placeholderName, '}}'),
      buildSplitPattern('[', placeholderName, ']'),
      buildSplitPattern('{', placeholderName, '}'),
    ]

    splitPatterns.forEach(pattern => {
      result = result.replace(pattern, escapedValue)
    })
  })

  return result
}

export async function generateDocx(
  template: Template,
  formData: FormData
): Promise<GeneratedDocument> {
  const zip = new PizZip(template.fileContent)
  
  // Try using docxtemplater for proper placeholder handling
  try {
    // Prepare data object for docxtemplater
    const data: Record<string, string> = {}
    
    template.placeholders.forEach(placeholder => {
      const value = formData[placeholder.id]
      
      // Format dates as DD-MM-YYYY
      const stringValue = value instanceof Date 
        ? formatDateDDMMYYYY(value) 
        : typeof value === 'string' && placeholder.type === 'date' && value
          ? formatDateDDMMYYYY(new Date(value))
          : String(value || '')
      
      // Use placeholder name as key (docxtemplater uses {name} format)
      data[placeholder.name] = stringValue
    })

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    })

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
  } catch (docxTemplaterError) {
    // Fallback to manual XML replacement if docxtemplater fails
    console.log('[v0] Docxtemplater failed, using manual replacement')
    
    const freshZip = new PizZip(template.fileContent)
    
    // Process all XML files in the document
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    ]
    
    for (const fileName of xmlFiles) {
      const file = freshZip.file(fileName)
      if (file) {
        let content = file.asText()
        content = replacePlaceholdersInXml(content, template.placeholders, formData)
        freshZip.file(fileName, content)
      }
    }

    const output = freshZip.generate({
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
}

export async function generatePdf(
  template: Template,
  formData: FormData
): Promise<GeneratedDocument> {
  // Generate DOCX first with placeholders replaced
  const docResult = await generateDocx(template, formData)
  
  const fileName = `${template.name.replace(/\.[^/.]+$/, '')}_generated.pdf`

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
