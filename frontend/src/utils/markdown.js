import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['img'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[/#.])/i,
}

const TABLE_DELIMITER_CELL_RE = /^\s*:?-{3,}:?\s*$/

const createMarkdown = ({ linkify }) => {
  const markdown = new MarkdownIt({
    html: false,
    linkify,
    breaks: true,
  }).enable(['table'])

  const defaultTableOpen =
    markdown.renderer.rules.table_open ||
    ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
  const defaultTableClose =
    markdown.renderer.rules.table_close ||
    ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))

  markdown.renderer.rules.table_open = (tokens, index, options, env, self) => {
    return `<div class="markdown-table-scroll">${defaultTableOpen(tokens, index, options, env, self)}`
  }
  markdown.renderer.rules.table_close = (tokens, index, options, env, self) => {
    return `${defaultTableClose(tokens, index, options, env, self)}</div>`
  }

  return markdown
}

const markdownWithLinks = createMarkdown({ linkify: true })
const markdownWithoutLinks = createMarkdown({ linkify: false })

export const sanitizeMarkdownHtml = (html) => {
  const source = String(html ?? '')
  if (!source) return ''

  if (typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify.sanitize(source, SANITIZE_OPTIONS)
  }

  return source.replace(/<img\b[^>]*>/gi, '')
}

export const renderMarkdown = (value, { linkify = true } = {}) => {
  const source = String(value ?? '')
  const markdown = linkify ? markdownWithLinks : markdownWithoutLinks
  return sanitizeMarkdownHtml(markdown.render(source))
}

const stripFencedCodeBlocks = (value) => {
  const lines = String(value ?? '').split(/\r?\n/)
  const output = []
  let fenceMarker = ''

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/)

    if (fenceMarker) {
      if (fenceMatch?.[1]?.[0] === fenceMarker[0] && fenceMatch[1].length >= fenceMarker.length) {
        fenceMarker = ''
      }
      output.push('')
      continue
    }

    if (fenceMatch) {
      fenceMarker = fenceMatch[1]
      output.push('')
      continue
    }

    output.push(line)
  }

  return output.join('\n')
}

const splitTableCells = (line) => {
  const text = String(line ?? '').trim()
  if (!text.includes('|')) return []
  return text.replace(/^\|/, '').replace(/\|$/, '').split('|')
}

const isTableHeaderRow = (line) => {
  const cells = splitTableCells(line)
  return cells.length >= 2 && cells.some((cell) => cell.trim())
}

const isTableDelimiterRow = (line) => {
  const cells = splitTableCells(line)
  return cells.length >= 2 && cells.every((cell) => TABLE_DELIMITER_CELL_RE.test(cell))
}

export const hasPipeTable = (value) => {
  const lines = stripFencedCodeBlocks(value).split(/\r?\n/)

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (isTableHeaderRow(lines[index]) && isTableDelimiterRow(lines[index + 1])) {
      return true
    }
  }

  return false
}

export const isLikelyMarkdown = (value) => {
  const text = String(value ?? '')
  if (!text.trim()) return false
  if (hasPipeTable(text)) return true

  let score = 0

  if (/```|~~~/.test(text)) score += 3
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) score += 2
  if (/(\*\*|__)[^\s].+?(\*\*|__)/.test(text)) score += 1

  const syntaxText = stripFencedCodeBlocks(text)
  const lines = syntaxText.split(/\r?\n/)
  if (lines.some((line) => /^#{1,6}\s+\S/.test(line))) score += 2
  if (lines.some((line) => /^\s*>\s+\S/.test(line))) score += 1
  if (lines.some((line) => /^\s*([-*+]|\d+\.)\s+\S/.test(line))) score += 1

  return score >= 2
}
