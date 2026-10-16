// Copies dagre's self-contained ES module build into resources/ so the editor can load it
// without a bundler. Run `npm run vendor` after changing the @dagrejs/dagre version.
const fs = require('fs')
const path = require('path')

const pkgDir = path.dirname(require.resolve('@dagrejs/dagre/package.json'))
const { version } = require('@dagrejs/dagre/package.json')
const outDir = path.join(__dirname, '..', 'resources', 'vendor')

const source = fs.readFileSync(path.join(pkgDir, 'dist', 'dagre.esm.js'), 'utf8')
    .replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'dagre.esm.js'), `/*! @dagrejs/dagre ${version} | MIT License | https://github.com/dagrejs/dagre */\n${source}`)
fs.copyFileSync(path.join(pkgDir, 'LICENSE'), path.join(outDir, 'dagre.LICENSE'))
