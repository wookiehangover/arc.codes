require = require('esm')(module) // eslint-disable-line
const arc = require('@architect/functions')
const static = arc.static
const path = require('path')
const util = require('util')
const fs = require('fs')
const Markdown = require('markdown-it')
const markdownClass = require('@toycode/markdown-it-class')
const markdownAnchor = require('markdown-it-anchor')
const frontmatterParser = require('markdown-it-front-matter')
const classMapping = require('./markdown-class-mappings')
const hljs = require('highlight.js')
const escapeHtml = Markdown().utils.escapeHtml
const highlight = require('./highlighter')
  .bind(null, hljs, escapeHtml)
const arcGrammar = require('./arc-grammar')
hljs.registerLanguage('arc', arcGrammar)
const readFile = util.promisify(fs.readFile)
const Html = require('@architect/views/modules/document/html.js').default
const toc = require('@architect/views/docs/table-of-contents')
const yaml = require('js-yaml')
const REPO = 'https://github.com/kristoferjoseph/arc.codes'
const EDIT_DOCS = `edit/trunk/src/views/docs/`

exports.handler = async function http (req) {
  let { pathParameters } = req
  let { lang, proxy } = pathParameters
  let parts = proxy.split('/')
  let docName = parts.pop()
  let doc = `${docName}.md`
  let activePath = path.join(
    'docs',
    lang,
    ...parts,
    docName
  )
  let editURL = path.join(
    REPO,
    EDIT_DOCS,
    lang,
    ...parts,
    doc
  )
  // Add leading slash to match anchor href
  let active = `/${ activePath }`

  let filePath = path.join(
    __dirname,
    'node_modules',
    '@architect',
    'views',
    'docs',
    lang,
    ...parts,
    doc
  )
  let file
  try {
    file = await readFile(filePath, 'utf8')
  }
  catch(err) {
    // TODO: Load next doc in section
    console.error(err)
    return {
      statusCode: 404,
      body: err.message
    }
  }
  // Declare in outer scope for use later... sorry
  let frontmatter = ''
  const md = Markdown({
    highlight,
    linkify: true,
    html: true,
    typography: true
  })
    .use(markdownClass, classMapping)
    .use(markdownAnchor, {
      permalinkSymbol: ' '
    })
    .use(frontmatterParser, function(str) {
      frontmatter = yaml.load(str)
    })
  const children = md.render(file)
  const { category, description, sections, title } = frontmatter

  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: Html({
      active,
      category,
      children,
      description,
      editURL,
      lang,
      sections,
      thirdparty: `
<script type=module src=/index.js crossorigin></script>
<script type=module src=/components/arc-tab-bar.js crossorigin></script>
      `,
      title,
      toc
    })
  }
}
