<template>
  <AppLayout>
    <BrutalCard title="上传文件">
      <BrutalUpload
        ref="uploadRef"
        @file-selected="handleUpload"
        @before-upload="beforeUpload"
      >
        <p class="upload-hint">支持单个文件上传，最大 5GB</p>
      </BrutalUpload>

      <BrutalDivider />

      <div class="upload-options">
        <BrutalFormItem label="过期时间">
          <BrutalRadio
            v-model="expiresIn"
            :options="[
              { label: '1天', value: 1 },
              { label: '3天', value: 3 },
              { label: '7天', value: 7 },
              { label: '30天', value: 30 },
            ]"
            name="expires"
          />
        </BrutalFormItem>

        <BrutalFormItem label="R2 配置">
          <BrutalSelect
            v-model="selectedR2ConfigId"
            :options="r2ConfigOptions"
            :disabled="isUploading || r2OptionsLoading"
          />
        </BrutalFormItem>

        <BrutalFormItem label="下载权限">
          <BrutalSwitch
            v-model="requireLogin"
            :checked-text="'需要登录'"
            :unchecked-text="'公开下载'"
          />
        </BrutalFormItem>
      </div>

      <BrutalAlert v-if="isUploading" type="info" class="upload-status">
        <template #default>
          <div class="upload-info">
            <strong>上传中: {{ currentFile?.name }}</strong>
            <BrutalProgress :percentage="displayProgress" :height="20" />
            <div class="upload-stats">
              <span
                >{{ formatBytes(uploadedSize) }} /
                {{ formatBytes(totalSize) }}</span
              >
              <span>{{ uploadSpeed }}</span>
              <span>剩余 {{ remainingTime }}</span>
            </div>
          </div>
        </template>
      </BrutalAlert>

      <div v-if="uploadResult" class="upload-result">
        <BrutalAlert :type="uploadResult.success ? 'success' : 'error'">
          <template #default>
            <div v-if="uploadResult.success">
              <div class="file-info">
                <strong>📄 {{ uploadResult.filename }}</strong>
              </div>
              <div class="upload-summary">
                <BrutalTag type="info">{{ uploadResult.fileSize }}</BrutalTag>
                <BrutalTag type="success">{{
                  uploadResult.avgSpeed
                }}</BrutalTag>
                <BrutalTag type="warning">{{
                  uploadResult.duration
                }}</BrutalTag>
              </div>
              <p class="expire-note">文件将在 {{ expiresIn }} 天后自动删除</p>

              <div class="link-group">
                <label class="link-label">短链接</label>
                <div class="link-row">
                  <BrutalInput
                    :model-value="uploadResult.shortUrl"
                    readonly
                    size="small"
                  />
                  <BrutalButton
                    type="primary"
                    size="small"
                    @click="copyShortUrl"
                    >复制</BrutalButton
                  >
                </div>
              </div>

              <div class="link-group">
                <label class="link-label">直链</label>
                <div class="link-row">
                  <BrutalInput
                    :model-value="uploadResult.downloadUrl"
                    readonly
                    size="small"
                  />
                  <BrutalButton
                    type="default"
                    size="small"
                    @click="copyDownloadUrl"
                    >复制</BrutalButton
                  >
                </div>
              </div>
            </div>
            <div v-else>
              {{ uploadResult.message }}
            </div>
          </template>
        </BrutalAlert>
      </div>
    </BrutalCard>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "../services/api";
import AppLayout from "../components/layout/AppLayout.vue";
import BrutalCard from "../components/ui/BrutalCard.vue";
import BrutalUpload from "../components/ui/BrutalUpload.vue";
import BrutalDivider from "../components/ui/BrutalDivider.vue";
import BrutalFormItem from "../components/ui/BrutalFormItem.vue";
import BrutalRadio from "../components/ui/BrutalRadio.vue";
import BrutalSwitch from "../components/ui/BrutalSwitch.vue";
import BrutalSelect from "../components/ui/BrutalSelect.vue";
import BrutalAlert from "../components/ui/BrutalAlert.vue";
import BrutalProgress from "../components/ui/BrutalProgress.vue";
import BrutalTag from "../components/ui/BrutalTag.vue";
import BrutalInput from "../components/ui/BrutalInput.vue";
import BrutalButton from "../components/ui/BrutalButton.vue";
import { useMessage } from "../composables/useMessage";

const message = useMessage();

const uploadRef = ref(null);
const expiresIn = ref(7);
const requireLogin = ref(true);

const selectedR2ConfigId = ref("");
const r2ConfigOptions = ref([]);
const r2OptionsLoading = ref(false);

onMounted(async () => {
  try {
    r2OptionsLoading.value = true;
    const result = await api.getR2Options();
    const opts = result.options || [];
    r2ConfigOptions.value = opts.map((opt) => ({
      label: opt.name,
      value: opt.id,
    }));
    selectedR2ConfigId.value = result.default_config_id || opts[0]?.id || "";
  } catch (error) {
    console.error("加载 R2 配置选项失败:", error);
    message.error("加载 R2 配置选项失败");
  } finally {
    r2OptionsLoading.value = false;
  }
});

const uploadProgress = ref(0);
const currentFile = ref(null);
const uploadResult = ref(null);
const isUploading = ref(false);
const uploadedSize = ref(0);
const totalSize = ref(0);
const uploadSpeed = ref("0 B/s");
const remainingTime = ref("计算中...");
const displayProgress = ref(0);
let uploadStartTime = 0;
let animationFrame = null;

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins} 分 ${secs} 秒`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours} 小时 ${mins} 分`;
};

const animateProgress = () => {
  const target = uploadProgress.value;
  const current = displayProgress.value;
  const diff = target - current;
  if (Math.abs(diff) > 0.5) {
    displayProgress.value = Math.round(current + diff * 0.2);
    animationFrame = requestAnimationFrame(animateProgress);
  } else {
    displayProgress.value = Math.round(target);
    animationFrame = null;
  }
};

const updateUploadStats = (loaded, total) => {
  const now = Date.now();
  uploadedSize.value = loaded;
  totalSize.value = total;
  const exactProgress = Math.round((loaded / total) * 100);
  uploadProgress.value = Math.min(exactProgress, 100);

  if (loaded >= total) {
    displayProgress.value = 100;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    return;
  }

  if (!animationFrame && isUploading.value) {
    animationFrame = requestAnimationFrame(animateProgress);
  }

  const elapsed = (now - uploadStartTime) / 1000;
  if (elapsed > 0.5) {
    const avgSpeed = loaded / elapsed;
    uploadSpeed.value = formatBytes(avgSpeed) + "/s";
    if (avgSpeed > 0) {
      const remaining = (total - loaded) / avgSpeed;
      if (remaining < 60) remainingTime.value = Math.round(remaining) + " 秒";
      else if (remaining < 3600)
        remainingTime.value = Math.round(remaining / 60) + " 分钟";
      else remainingTime.value = (remaining / 3600).toFixed(1) + " 小时";
    }
  }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

const beforeUpload = ({ file }) => {
  if (file.file.size > MAX_FILE_SIZE) {
    message.error("文件大小超过 5GB 限制");
    return false;
  }
  return true;
};

const handleUpload = async ({ file }) => {
  currentFile.value = file;
  uploadProgress.value = 0;
  displayProgress.value = 0;
  uploadResult.value = null;
  isUploading.value = true;
  uploadedSize.value = 0;
  totalSize.value = file.file.size;
  uploadSpeed.value = "准备中...";
  remainingTime.value = "计算中...";
  uploadStartTime = Date.now();
  animationFrame = null;

  try {
    uploadRef.value?.clear();
    const fileSize = file.file.size;

    if (fileSize < 100 * 1024 * 1024) {
      await uploadSmallFile(file);
    } else {
      await uploadLargeFile(file);
    }
  } catch (error) {
    console.error("上传错误:", error);
    uploadResult.value = {
      success: false,
      message: error.response?.data?.error || error.message || "上传失败",
    };
  } finally {
    isUploading.value = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }
};

const uploadSmallFile = async (file) => {
  const response = await api.getUploadURL({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.file.size,
    expires_in: expiresIn.value,
    require_login: requireLogin.value,
    config_id: selectedR2ConfigId.value || undefined,
  });

  await api.uploadToR2(
    response.upload_url,
    file.file,
    (percent, loaded, total) => {
      updateUploadStats(loaded, total);
    }
  );

  const uploadEndTime = Date.now();
  const duration = (uploadEndTime - uploadStartTime) / 1000;
  const avgSpeed = file.file.size / duration;

  uploadProgress.value = 100;
  displayProgress.value = 100;

  const confirmResult = await api.confirmUpload(response.file_id);
  const downloadUrl = confirmResult.download_url?.startsWith("http")
    ? confirmResult.download_url
    : window.location.origin +
      (confirmResult.download_url || response.download_url);

  uploadResult.value = {
    success: true,
    filename: file.name,
    downloadUrl: downloadUrl,
    shortUrl:
      window.location.origin + (confirmResult.short_url || response.short_url),
    fileSize: formatBytes(file.file.size),
    avgSpeed: formatBytes(avgSpeed) + "/s",
    duration: formatDuration(duration),
  };

  message.success("文件上传成功！");
};

const uploadLargeFile = async (file) => {
  const initResponse = await api.initMultipartUpload({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.file.size,
    expires_in: expiresIn.value,
    require_login: requireLogin.value,
    config_id: selectedR2ConfigId.value || undefined,
  });

  const { file_id, upload_id, part_size, total_parts } = initResponse;
  const CONCURRENCY = 3;
  const partProgress = new Array(total_parts).fill(0);

  const updateTotalProgress = () => {
    const totalLoaded = partProgress.reduce((a, b) => a + b, 0);
    updateUploadStats(totalLoaded, file.file.size);
  };

  const uploadPart = async (partIndex) => {
    const partNumber = partIndex + 1;
    const start = partIndex * part_size;
    const end = Math.min(start + part_size, file.file.size);
    const chunk = file.file.slice(start, end);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const presignResponse = await api.getMultipartUploadURL({
          file_id,
          upload_id,
          part_number: partNumber,
        });

        const uploadResponse = await api.uploadToR2(
          presignResponse.upload_url,
          chunk,
          (percent, loaded) => {
            partProgress[partIndex] = loaded;
            updateTotalProgress();
          }
        );

        let etag = uploadResponse.headers?.etag || "";
        if (!etag) throw new Error(`分片 ${partNumber} 未返回 ETag`);
        if (!etag.startsWith('"')) etag = `"${etag}"`;

        partProgress[partIndex] = end - start;
        updateTotalProgress();

        return { part_number: partNumber, etag };
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  };

  const uploadedParts = [];
  let currentIndex = 0;

  const uploadNext = async () => {
    while (currentIndex < total_parts) {
      const partIndex = currentIndex++;
      const result = await uploadPart(partIndex);
      uploadedParts.push(result);
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, total_parts); i++) {
    workers.push(uploadNext());
  }
  await Promise.all(workers);

  const validParts = uploadedParts
    .filter((p) => p && p.etag)
    .sort((a, b) => a.part_number - b.part_number);

  if (validParts.length !== total_parts) {
    throw new Error(`分片上传不完整: ${validParts.length}/${total_parts}`);
  }

  const completeResponse = await api.completeMultipartUpload({
    file_id,
    upload_id,
    parts: validParts,
  });

  const uploadEndTime = Date.now();
  const duration = (uploadEndTime - uploadStartTime) / 1000;
  const avgSpeed = file.file.size / duration;

  uploadProgress.value = 100;
  displayProgress.value = 100;

  const downloadUrl = completeResponse.download_url?.startsWith("http")
    ? completeResponse.download_url
    : window.location.origin + completeResponse.download_url;

  uploadResult.value = {
    success: true,
    filename: file.name,
    downloadUrl: downloadUrl,
    shortUrl: window.location.origin + completeResponse.short_url,
    fileSize: formatBytes(file.file.size),
    avgSpeed: formatBytes(avgSpeed) + "/s",
    duration: formatDuration(duration),
  };

  message.success("文件上传成功！");
};

const copyShortUrl = () => {
  if (uploadResult.value?.shortUrl) {
    navigator.clipboard.writeText(uploadResult.value.shortUrl);
    message.success("短链接已复制到剪贴板");
  }
};

const copyDownloadUrl = () => {
  if (uploadResult.value?.downloadUrl) {
    navigator.clipboard.writeText(uploadResult.value.downloadUrl);
    message.success("完整链接已复制到剪贴板");
  }
};
</script>

<style scoped>
.upload-hint {
  color: var(--nb-gray-500);
  font-size: 14px;
  margin-top: var(--nb-space-sm);
}

.upload-options {
  display: grid;
  gap: var(--nb-space-md);
}

.upload-status {
  margin-top: var(--nb-space-lg);
}

.upload-info {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.upload-stats {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--nb-gray-500);
}

.upload-result {
  margin-top: var(--nb-space-lg);
}

.file-info {
  margin-bottom: var(--nb-space-md);
  font-size: 15px;
  word-break: break-all;
}

.upload-summary {
  display: flex;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
  margin-bottom: var(--nb-space-md);
}

.expire-note {
  font-size: 14px;
  color: var(--nb-gray-500);
  margin-bottom: var(--nb-space-md);
}

.link-group {
  margin-bottom: var(--nb-space-md);
}

.link-label {
  display: block;
  font-size: 12px;
  color: var(--nb-gray-500);
  margin-bottom: 4px;
}

.link-row {
  display: flex;
  gap: var(--nb-space-sm);
}

.link-row > :first-child {
  flex: 1;
}
</style>
