import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const questions = JSON.parse(await readFile(resolve(root, 'src/data/questions.json'), 'utf8'))
const errors = []

if (questions.length !== 150) errors.push(`Phải có 150 câu, hiện có ${questions.length}.`)
for (let index = 0; index < questions.length; index += 1) {
  const question = questions[index]
  if (question.id !== index + 1) errors.push(`Sai thứ tự tại vị trí ${index + 1}.`)
  if (!question.question?.trim()) errors.push(`Câu ${question.id} thiếu nội dung.`)
  if (!Array.isArray(question.options) || question.options.length < 2) {
    errors.push(`Câu ${question.id} thiếu lựa chọn.`)
  }
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
    errors.push(`Câu ${question.id} có đáp án không hợp lệ.`)
  }
  if (question.image) {
    try {
      await access(resolve(root, 'public', question.image.replace(/^\//, '')))
    } catch {
      errors.push(`Câu ${question.id} thiếu ảnh ${question.image}.`)
    }
  }
}

const criticalIds = questions.filter((question) => question.critical).map((question) => question.id)
const expectedCritical = [16, 27, 31, 32, 56, 58]
if (JSON.stringify(criticalIds) !== JSON.stringify(expectedCritical)) {
  errors.push(`Danh sách câu * không đúng: ${criticalIds.join(', ')}.`)
}

const imageCount = questions.filter((question) => question.image).length
if (imageCount !== 55) errors.push(`Phải có 55 câu có ảnh, hiện có ${imageCount}.`)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Dữ liệu hợp lệ: 150 câu, 55 hình, 6 câu trọng yếu.')
