<script setup>
import { ref } from 'vue'

const emit = defineEmits(['file-selected', 'before-upload'])

const isDragging = ref(false)
const fileInput = ref(null)

const onDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length) {
    handleFile(files[0])
  }
}

const onChange = (e) => {
  if (e.target.files.length) {
    handleFile(e.target.files[0])
  }
}

const handleFile = (file) => {
  const shouldContinue = emit('before-upload', { file: { file, name: file.name, type: file.type } })
  if (shouldContinue !== false) {
    emit('file-selected', { file: { file, name: file.name, type: file.type } })
  }
}

const clear = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

defineExpose({ clear })
</script>

<template>
  <div
    class="shadcn-upload"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="fileInput?.click()"
  >
    <input ref="fileInput" type="file" hidden @change="onChange" />
    <div class="upload-content">
      <div class="upload-icon">📁</div>
      <div class="upload-text">
        <p class="upload-hint">点击或拖拽文件到此处上传</p>
        <p class="upload-desc">支持单个文件上传</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.shadcn-upload {
  border: 2px dashed var(--input);
  border-radius: var(--nb-radius-lg);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--background);
}

.shadcn-upload:hover {
  border-color: var(--ring);
  background: color-mix(in oklab, var(--accent) 50%, var(--background));
}

.shadcn-upload.dragging {
  border-color: var(--primary);
  background: color-mix(in oklab, var(--accent) 65%, var(--background));
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 48px;
  opacity: 0.6;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-hint {
  font-size: 14px;
  font-weight: var(--nb-font-weight-medium);
  color: var(--foreground);
  margin: 0;
}

.upload-desc {
  font-size: 12px;
  color: var(--muted-foreground);
  margin: 0;
}
</style>
