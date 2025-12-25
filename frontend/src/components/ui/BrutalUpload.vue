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
    class="brutal-upload"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="fileInput?.click()"
  >
    <input ref="fileInput" type="file" hidden @change="onChange" />
    <div class="upload-content">
      <div class="upload-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
        </svg>
      </div>
      <div class="upload-text">
        <strong>拖拽文件到此处</strong>
        <span>或点击上传</span>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.brutal-upload {
  border: var(--nb-border-width) dashed var(--nb-black);
  background: var(--nb-surface);
  padding: var(--nb-space-2xl);
  text-align: center;
  cursor: pointer;
  transition: var(--nb-transition-fast);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow);
}

.brutal-upload:hover,
.brutal-upload.dragging {
  background: var(--nb-accent);
  border-style: solid;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nb-space-md);
}

.upload-icon {
  color: var(--nb-gray-500);
}

.brutal-upload:hover .upload-icon,
.brutal-upload.dragging .upload-icon {
  color: var(--nb-black);
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--nb-font-mono);
}

.upload-text strong {
  font-size: 18px;
  text-transform: uppercase;
}

.upload-text span {
  color: var(--nb-gray-500);
  font-size: 14px;
}
</style>
