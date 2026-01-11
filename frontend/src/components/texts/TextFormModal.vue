<template>
  <Modal
    :show="show"
    :title="modalTitle"
    :width="markdownPreview ? '1440px' : '720px'"
    @update:show="handleUpdateShow"
  >
    <template v-if="loading">
      <div class="modal-state">{{ t('texts.state.loading') }}</div>
    </template>

    <template v-else>
      <FormItem :label="t('texts.form.title')">
        <Input
          v-model="form.title"
          :placeholder="t('texts.form.titlePlaceholder')"
          clearable
        />
      </FormItem>

      <FormItem :label="t('texts.form.content')">
        <div class="markdown-editor">
          <div class="markdown-toolbar">
            <div class="markdown-toolbar-actions">
              <Tooltip
                v-for="action in markdownToolbarActions"
                :key="action.key"
                :content="action.label"
              >
                <Button
                  type="ghost"
                  size="small"
                  class="markdown-tool-btn"
                  :aria-label="action.label"
                  @mousedown.prevent="noop"
                  @click="applyMarkdownAction(action.key)"
                >
                  <component :is="action.icon" :size="16" />
                </Button>
              </Tooltip>
            </div>

            <Switch v-model="markdownPreview" :label="t('texts.markdown.preview')" />
          </div>

          <div class="markdown-editor-body" :class="{ split: markdownPreview }">
            <Input
              ref="contentInputRef"
              v-model="form.content"
              type="textarea"
              :rows="12"
              :placeholder="t('texts.form.contentPlaceholder')"
              class="markdown-editor-input"
            />
            <div v-if="markdownPreview" ref="markdownPreviewRef" class="markdown-preview">
              <div class="text-viewer-markdown" v-html="markdownHtml"></div>
            </div>
          </div>
        </div>
      </FormItem>
    </template>

    <template #footer>
      <Button type="default" :disabled="submitting" @click="handleCancel">
        {{ t('common.cancel') }}
      </Button>
      <Button
        type="primary"
        :loading="submitting"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ mode === 'create' ? t('common.create') : t('common.submit') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import Modal from '../ui/modal/Modal.vue'
import FormItem from '../ui/form-item/FormItem.vue'
import Input from '../ui/input/Input.vue'
import Button from '../ui/button/Button.vue'
import Switch from '../ui/switch/Switch.vue'
import Tooltip from '../ui/tooltip/Tooltip.vue'
import api from '../../services/api'
import { useMessage } from '../../composables/useMessage'

const props = defineProps({
  show: Boolean,
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value),
  },
  textId: String,
})

const emit = defineEmits(['update:show', 'success'])

const { t } = useI18n({ useScope: 'global' })
const message = useMessage()

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const noop = () => {}

const form = ref({ title: '', content: '' })
const contentInputRef = ref(null)
const markdownPreview = ref(false)
const markdownPreviewRef = ref(null)
const loading = ref(false)
const submitting = ref(false)

const modalTitle = computed(() => {
  return props.mode === 'create'
    ? t('texts.modals.createTitle')
    : t('texts.modals.editTitle')
})

const markdownHtml = computed(() => {
  if (!markdownPreview.value) return ''
  return renderMarkdown(form.value.content)
})

const markdownToolbarActions = computed(() => [
  { key: 'heading1', icon: Heading1, label: t('texts.markdown.actions.heading1') },
  { key: 'bold', icon: Bold, label: t('texts.markdown.actions.bold') },
  { key: 'italic', icon: Italic, label: t('texts.markdown.actions.italic') },
  { key: 'strike', icon: Strikethrough, label: t('texts.markdown.actions.strike') },
  { key: 'link', icon: Link2, label: t('texts.markdown.actions.link') },
  { key: 'quote', icon: Quote, label: t('texts.markdown.actions.quote') },
  { key: 'ul', icon: List, label: t('texts.markdown.actions.ul') },
  { key: 'ol', icon: ListOrdered, label: t('texts.markdown.actions.ol') },
  { key: 'code', icon: Code, label: t('texts.markdown.actions.code') },
  { key: 'codeBlock', icon: Code2, label: t('texts.markdown.actions.codeBlock') },
  { key: 'hr', icon: Minus, label: t('texts.markdown.actions.hr') },
])

const sanitizeMarkdownHtml = (html) => {
  if (typeof window === 'undefined') return html
  if (!html) return ''

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('script, iframe, object, embed, style').forEach((el) => el.remove())
  doc.querySelectorAll('img').forEach((img) => img.remove())

  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name)
      }
    }
  })

  doc.querySelectorAll('a').forEach((anchor) => {
    const rawHref = anchor.getAttribute('href') || ''
    const isRelative =
      rawHref.startsWith('#') ||
      rawHref.startsWith('/') ||
      rawHref.startsWith('./') ||
      rawHref.startsWith('../')

    let isSafe = isRelative
    let isExternal = false

    if (!isSafe) {
      try {
        const url = new URL(rawHref, window.location.origin)
        isExternal = url.origin !== window.location.origin
        isSafe = ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
      } catch {
        isSafe = false
      }
    }

    if (!isSafe) {
      anchor.removeAttribute('href')
      return
    }

    if (isExternal) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return doc.body.innerHTML
}

const renderMarkdown = (value) => {
  const source = String(value ?? '')
  const raw = markdown.render(source)
  return sanitizeMarkdownHtml(raw)
}

const buildAutoTitle = (content) => {
  const source = String(content ?? '').trim()
  if (!source) return ''

  const firstNonEmptyLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  const normalized = String(firstNonEmptyLine ?? source)
    .replace(/\s+/g, ' ')
    .trim()
  const maxChars = 50
  const chars = Array.from(normalized)
  return chars.length > maxChars ? `${chars.slice(0, maxChars).join('')}…` : normalized
}

const getTextareaEl = (inputRef) => {
  const root = inputRef.value?.$el
  return root?.querySelector?.('textarea') ?? null
}

const getScrollRatio = (el) => {
  if (!el) return 0
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) return 0
  return el.scrollTop / maxScroll
}

const applyScrollRatio = (el, ratio) => {
  if (!el) return
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) {
    el.scrollTop = 0
    return
  }
  const nextScrollTop = Math.max(0, Math.min(1, ratio)) * maxScroll
  el.scrollTop = nextScrollTop
}

let editorScrollRaf = 0
const syncPreviewScrollFromEditor = () => {
  if (typeof window === 'undefined') return
  if (!markdownPreview.value) return

  if (editorScrollRaf) {
    window.cancelAnimationFrame(editorScrollRaf)
  }

  editorScrollRaf = window.requestAnimationFrame(() => {
    editorScrollRaf = 0
    const textarea = getTextareaEl(contentInputRef)
    const previewEl = markdownPreviewRef.value
    if (!textarea || !previewEl) return
    applyScrollRatio(previewEl, getScrollRatio(textarea))
  })
}

let detachEditorScrollListener = null
const detachScrollSync = () => {
  if (typeof detachEditorScrollListener === 'function') {
    detachEditorScrollListener()
  }
  detachEditorScrollListener = null

  if (typeof window !== 'undefined' && editorScrollRaf) {
    window.cancelAnimationFrame(editorScrollRaf)
    editorScrollRaf = 0
  }
}

const attachScrollSync = async () => {
  if (typeof window === 'undefined') return

  await nextTick()
  if (!markdownPreview.value) return
  const textarea = getTextareaEl(contentInputRef)
  if (!textarea) return

  textarea.addEventListener('scroll', syncPreviewScrollFromEditor, { passive: true })
  detachEditorScrollListener = () => {
    textarea.removeEventListener('scroll', syncPreviewScrollFromEditor)
  }

  syncPreviewScrollFromEditor()
}

const getSelectionRange = (textarea, value) => {
  const fallback = value.length
  const rawStart = Number.isFinite(textarea?.selectionStart) ? textarea.selectionStart : fallback
  const rawEnd = Number.isFinite(textarea?.selectionEnd) ? textarea.selectionEnd : fallback
  const start = Math.max(0, Math.min(rawStart, rawEnd, value.length))
  const end = Math.max(0, Math.min(Math.max(rawStart, rawEnd), value.length))
  return { start, end }
}

const updateEditor = async (nextValue, selectionStart, selectionEnd) => {
  form.value.content = nextValue
  await nextTick()
  const textarea = getTextareaEl(contentInputRef)
  if (!textarea) return
  textarea.focus()
  const start = Math.max(0, Math.min(selectionStart, nextValue.length))
  const end = Math.max(0, Math.min(selectionEnd, nextValue.length))
  textarea.setSelectionRange(start, end)
}

const wrapSelection = async ({ prefix, suffix = prefix } = {}) => {
  const textarea = getTextareaEl(contentInputRef)
  const value = form.value.content
  const { start, end } = getSelectionRange(textarea, value)
  const selected = value.slice(start, end)
  const insert = `${prefix}${selected}${suffix}`
  const nextValue = value.slice(0, start) + insert + value.slice(end)
  const cursor = start + prefix.length
  const nextEnd = cursor + selected.length
  await updateEditor(nextValue, cursor, nextEnd)
}

const prefixLines = async (prefixer) => {
  const textarea = getTextareaEl(contentInputRef)
  const value = form.value.content
  const { start, end } = getSelectionRange(textarea, value)

  const blockStart = value.lastIndexOf('\n', start - 1) + 1
  const blockEnd = (() => {
    const nextNewline = value.indexOf('\n', end)
    return nextNewline === -1 ? value.length : nextNewline
  })()

  const block = value.slice(blockStart, blockEnd)
  const lines = block.split('\n')
  const updated = lines
    .map((line, index) => {
      if (!line.trim()) return line
      return `${prefixer(index)}${line}`
    })
    .join('\n')

  const nextValue = value.slice(0, blockStart) + updated + value.slice(blockEnd)
  await updateEditor(nextValue, blockStart, blockStart + updated.length)
}

const applyMarkdownAction = async (actionKey) => {
  const textarea = getTextareaEl(contentInputRef)
  const value = form.value.content
  const { start, end } = getSelectionRange(textarea, value)
  const selected = value.slice(start, end)

  switch (actionKey) {
    case 'heading1':
      await prefixLines(() => '# ')
      return
    case 'bold':
      await wrapSelection({ prefix: '**', suffix: '**' })
      return
    case 'italic':
      await wrapSelection({ prefix: '*', suffix: '*' })
      return
    case 'strike':
      await wrapSelection({ prefix: '~~', suffix: '~~' })
      return
    case 'quote':
      await prefixLines(() => '> ')
      return
    case 'ul':
      await prefixLines(() => '- ')
      return
    case 'ol':
      await prefixLines((index) => `${index + 1}. `)
      return
    case 'code':
      await wrapSelection({ prefix: '`', suffix: '`' })
      return
    case 'codeBlock': {
      const prefix = '```\n'
      const suffix = '\n```'
      const insert = `${prefix}${selected}${suffix}`
      const nextValue = value.slice(0, start) + insert + value.slice(end)
      const selectionStart = start + prefix.length
      const selectionEnd = selectionStart + selected.length
      await updateEditor(nextValue, selectionStart, selectionEnd)
      return
    }
    case 'link': {
      const label = selected || 'link'
      const url = 'https://'
      const insert = `[${label}](${url})`
      const nextValue = value.slice(0, start) + insert + value.slice(end)
      const urlStart = start + label.length + 3
      await updateEditor(nextValue, urlStart, urlStart + url.length)
      return
    }
    case 'hr': {
      const insert = `${start === 0 ? '' : '\n'}---\n`
      const nextValue = value.slice(0, start) + insert + value.slice(end)
      await updateEditor(nextValue, start + insert.length, start + insert.length)
      return
    }
    default:
      return
  }
}

const resetForm = () => {
  form.value = { title: '', content: '' }
  markdownPreview.value = false
  loading.value = false
  submitting.value = false
}

const loadTextData = async () => {
  if (props.mode !== 'edit' || !props.textId) return

  loading.value = true
  try {
    const result = await api.getText(props.textId)
    const text = result?.text || {}
    form.value = {
      title: String(text.title ?? ''),
      content: String(text.content ?? ''),
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.openFailed'))
    emit('update:show', false)
  } finally {
    loading.value = false
  }
}

const handleUpdateShow = (value) => {
  emit('update:show', value)
}

const handleCancel = () => {
  emit('update:show', false)
}

const handleSubmit = async () => {
  if (submitting.value || loading.value) return

  const content = String(form.value.content ?? '').trim()
  if (!content) {
    message.error(t('texts.validation.contentRequired'))
    return
  }

  submitting.value = true
  try {
    const rawTitle = String(form.value.title ?? '').trim()
    const title = rawTitle || buildAutoTitle(content)
    if (!rawTitle && title) {
      form.value.title = title
    }

    if (props.mode === 'create') {
      await api.createText({ title, content })
      message.success(t('texts.messages.createSuccess'))
    } else {
      await api.updateText(props.textId, { title, content })
      message.success(t('texts.messages.updateSuccess'))
    }

    emit('update:show', false)
    emit('success')
  } catch (error) {
    const errorMsg =
      props.mode === 'create'
        ? t('texts.messages.createFailed')
        : t('texts.messages.updateFailed')
    message.error(error.response?.data?.error || errorMsg)
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      if (props.mode === 'edit') {
        loadTextData()
      } else {
        resetForm()
      }
    } else {
      resetForm()
    }
  }
)

watch(markdownPreview, async (enabled) => {
  if (!enabled) {
    detachScrollSync()
    return
  }
  detachScrollSync()
  await attachScrollSync()
})

onBeforeUnmount(() => {
  detachScrollSync()
})
</script>

<style scoped>
.modal-state {
  padding: var(--nb-space-md);
  text-align: center;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.markdown-editor {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.markdown-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
  padding: 6px 8px;
  border: var(--nb-border-thin);
  border-radius: var(--nb-radius);
  background: var(--nb-surface);
}

.markdown-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.markdown-toolbar .markdown-tool-btn {
  width: 32px;
  height: 32px;
  padding: 0;
}

.markdown-editor-input :deep(textarea) {
  font-family: var(--nb-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  tab-size: 2;
}

.markdown-editor-body {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.markdown-editor-body.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--nb-space-sm);
  height: min(52vh, 520px);
}

.markdown-editor-body.split .markdown-editor-input {
  height: 100%;
}

.markdown-editor-body.split .markdown-editor-input :deep(textarea) {
  height: 100%;
  resize: none;
}

.markdown-preview {
  border: var(--nb-border-thin);
  border-radius: var(--nb-radius);
  background: var(--nb-gray-100);
  padding: var(--nb-space-sm);
  overflow: auto;
}

.markdown-editor-body.split .markdown-preview {
  height: 100%;
  background: var(--nb-surface);
}

@media (max-width: 900px) {
  .markdown-editor-body.split {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.text-viewer-markdown {
  font-size: var(--nb-font-size-sm);
  line-height: 1.6;
  color: var(--nb-ink);
}

.text-viewer-markdown :deep(p) {
  margin: 0 0 var(--nb-space-sm);
}

.text-viewer-markdown :deep(h1),
.text-viewer-markdown :deep(h2),
.text-viewer-markdown :deep(h3),
.text-viewer-markdown :deep(h4),
.text-viewer-markdown :deep(h5),
.text-viewer-markdown :deep(h6) {
  margin: var(--nb-space-md) 0 var(--nb-space-sm);
  font-family: var(--nb-heading-font-family, var(--nb-font-ui));
  font-weight: var(--nb-heading-font-weight, 700);
  line-height: 1.25;
}

.text-viewer-markdown :deep(h1) {
  font-size: 1.25rem;
}

.text-viewer-markdown :deep(h2) {
  font-size: 1.125rem;
}

.text-viewer-markdown :deep(h3) {
  font-size: 1rem;
}

.text-viewer-markdown :deep(ul),
.text-viewer-markdown :deep(ol) {
  margin: 0 0 var(--nb-space-sm);
  padding-left: 1.25rem;
}

.text-viewer-markdown :deep(li) {
  margin: 0.25rem 0;
}

.text-viewer-markdown :deep(a) {
  color: var(--nb-link-color, var(--nb-primary));
  text-decoration: underline;
}

.text-viewer-markdown :deep(blockquote) {
  margin: 0 0 var(--nb-space-sm);
  padding: 0.5rem 0.75rem;
  border-left: 4px solid var(--nb-border-color, var(--nb-black));
  background: color-mix(in oklab, var(--nb-gray-50) 70%, transparent);
}

.text-viewer-markdown :deep(pre) {
  margin: 0 0 var(--nb-space-sm);
  padding: var(--nb-space-sm);
  border: var(--nb-border-thin);
  border-radius: var(--nb-radius);
  background: var(--nb-surface);
  overflow: auto;
}

.text-viewer-markdown :deep(code) {
  font-family: var(--nb-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 0.9em;
}

.text-viewer-markdown :deep(p > code),
.text-viewer-markdown :deep(li > code) {
  padding: 0.1em 0.35em;
  border: var(--nb-border-thin);
  border-radius: calc(var(--nb-radius) - 1px);
  background: var(--nb-surface);
}
</style>
