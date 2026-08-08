import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(
  process.argv[2] ?? resolve(projectRoot, '../upload/Luyen_thi_150_cau_xe_may.html'),
)
const html = await readFile(sourcePath, 'utf8')
const match = html.match(/\bconst\s+Q\s*=\s*(\[.*?\]);\s*\n/s)

if (!match) throw new Error('Không tìm thấy mảng câu hỏi Q trong file HTML nguồn.')

const questions = JSON.parse(match[1])
const imageDir = resolve(projectRoot, 'public/question-images')
const dataDir = resolve(projectRoot, 'src/data')
await mkdir(imageDir, { recursive: true })
await mkdir(dataDir, { recursive: true })

for (const question of questions) {
  if (!question.image) continue
  const [meta, payload] = question.image.split(',', 2)
  const mime = meta.match(/^data:([^;]+)/)?.[1]
  const extension = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg'
  const filename = `q${String(question.id).padStart(3, '0')}${extension}`
  await writeFile(resolve(imageDir, filename), Buffer.from(payload, 'base64'))
  question.image = `/question-images/${filename}`
}

await writeFile(
  resolve(dataDir, 'questions.json'),
  `${JSON.stringify(questions, null, 2)}\n`,
)

console.log(`Đã chuyển ${questions.length} câu hỏi và hình ảnh từ ${sourcePath}.`)
