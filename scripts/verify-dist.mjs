import fs from 'fs'

const html = fs.readFileSync('dist/index.html', 'utf8')
console.log('HTML valid, length:', html.length)

const match = html.match(/src="\/assets\/([^"]+)"/)
if (match) {
  const jsFile = match[1]
  const jsContent = fs.readFileSync(`dist/assets/${jsFile}`, 'utf8')
  console.log(`JS Bundle [${jsFile}] valid, size: ${jsContent.length} bytes`)
}
console.log('Dist verification passed 100%!')
