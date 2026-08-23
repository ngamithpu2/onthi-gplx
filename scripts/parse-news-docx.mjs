import fs from 'fs'

const xml = fs.readFileSync('Tintuc/extracted/word/document.xml', 'utf8')
const paragraphs = []
const pMatches = xml.matchAll(/<w:p[^>]*>(.*?)<\/w:p>/gs)

for (const match of pMatches) {
  const pContent = match[1]
  const text = pContent.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
  if (text) {
    paragraphs.push(text)
  }
}

const fullText = paragraphs.join('\n\n')
fs.writeFileSync('Tintuc/extracted_article.txt', fullText, 'utf8')
console.log('Total paragraphs:', paragraphs.length)
console.log('Full text preview:\n', fullText.slice(0, 1000))
