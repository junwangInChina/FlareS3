<template>
  <Modal
    :show="show"
    :title="t('texts.modals.viewTitle')"
    width="720px"
    @update:show="handleUpdateShow"
  >
    <template v-if="loading">
      <div class="modal-state">{{ t('texts.state.loading') }}</div>
    </template>

    <template v-else>
      <div class="text-viewer">
        <Button
          type="ghost"
          size="small"
          class="text-viewer-copy"
          :aria-label="t('upload.copy')"
          :disabled="!content"
          @click="copyContent"
        >
          <Copy :size="16" />
        </Button>
        <div class="text-viewer-body">
          <div v-if="isMarkdown" class="text-viewer-markdown" v-html="markdownHtml"></div>
          <pre v-else class="text-viewer-content">{{ content || '-' }}</pre>
        </div>
      </div>
    </template>

    <template #footer>
      <Button type="default" @click="handleClose">{{ t('common.close') }}</Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Copy } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import Modal from '../ui/modal/Modal.vue'
import Button from '../ui/button/Button.vue'
import api from '../../services/api'
import { useMessage } from '../../composables/useMessage'

const props = defineProps({
  show: Boolean,
  textId: String,
})

const emit = defineEmits(['update:show'])

const { t } = useI18n({ useScope: 'global' })
const message = useMessage()

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const content = ref('')
const loading = ref(false)

const isMarkdown = computed(() => isLikelyMarkdown(content.value))
const markdownHtml = computed(() => (isMarkdown.value ? renderMarkdown(content.value) : ''))

const isLikelyMarkdown = (value) => {
  const text = String(value ?? '')
  if (!text.trim()) return false

  let score = 0

  if (/```|~~~/.test(text)) score += 3
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) score += 2
  if (/(\*\*|__)[^\s].+?(\*\*|__)/.test(text)) score += 1

  const lines = text.split(/\r?\n/)
  if (lines.some((line) => /^#{1,6}\s+\S/.test(line))) score += 2
  if (lines.some((line) => /^\s*>\s+\S/.test(line))) score += 1
  if (lines.some((line) => /^\s*([-*+]|\d+\.)\s+\S/.test(line))) score += 1

  return score >= 2
}

const sanitizeMarkdownHtml = (html) => {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[/#.])/i,
  })
}

const renderMarkdown = (value) => {
  const source = String(value ?? '')
  const raw = markdown.render(source)
  return sanitizeMarkdownHtml(raw)
}

const resetView = () => {
  content.value = ''
  loading.value = false
}

const loadTextData = async () => {
  if (!props.textId) return

  loading.value = true
  try {
    const result = await api.getText(props.textId)
    content.value = String(result?.text?.content ?? '')
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.openFailed'))
    emit('update:show', false)
  } finally {
    loading.value = false
  }
}

const copyContent = () => {
  if (!content.value) return
  navigator.clipboard.writeText(content.value)
  message.success(t('common.copied'))
}

const handleUpdateShow = (value) => {
  emit('update:show', value)
}

const handleClose = () => {
  emit('update:show', false)
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      loadTextData()
    } else {
      resetView()
    }
  }
)
</script>

<style scoped>
.modal-state {
  padding: var(--nb-space-md);
  text-align: center;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.text-viewer {
  position: relative;
  border: var(--nb-border-thin);
  border-radius: var(--nb-radius);
  background: var(--nb-gray-100);
  padding: var(--nb-space-md);
}

.text-viewer-body {
  max-height: 60vh;
  overflow: auto;
}

.text-viewer-copy {
  position: absolute;
  top: var(--nb-space-sm);
  right: var(--nb-space-sm);
  width: 32px;
  height: 32px;
  padding: 0;
  z-index: 2;
  background: color-mix(in oklab, var(--nb-surface, var(--background)) 85%, transparent);
  border: var(--nb-border-thin);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow-sm);
}

.text-viewer-content {
  margin: 0;
  font-family: var(
    --nb-font-mono,
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace
  );
  font-size: var(--nb-font-size-sm);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
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
  font-family: var(
    --nb-font-mono,
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace
  );
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
