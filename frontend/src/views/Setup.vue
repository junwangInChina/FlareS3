<template>
  <AppLayout>
    <div class="setup-page">
      <header class="setup-header">
        <div class="setup-title-group">
          <div class="setup-title-row">
            <h1 class="setup-title">{{ t("setup.title") }}</h1>
            <Button
              type="ghost"
              size="small"
              class="setup-help-btn"
              :aria-label="t('setup.help')"
              @click="usageTipsVisible = true"
            >
              <AlertTriangle :size="18" />
            </Button>
          </div>
          <p class="setup-subtitle">
            {{ t("setup.subtitle") }}
          </p>
        </div>

        <div class="setup-actions">
          <Button type="primary" size="large" @click="openCreate">
            <Plus :size="18" style="margin-right: 6px" />
            {{ t("setup.actions.addConfig") }}
          </Button>
          <Button
            type="default"
            size="large"
            :loading="loading"
            @click="refresh"
          >
            <RefreshCw :size="18" style="margin-right: 6px" />
            {{ t("setup.actions.refreshList") }}
          </Button>
        </div>
      </header>

      <section class="config-list">
        <div v-if="loading" class="config-state">{{ t("setup.state.loading") }}</div>

        <Alert
          v-else-if="configs.length === 0"
          type="info"
          :title="t('setup.state.emptyTitle')"
        >
          {{ t("setup.state.emptyContent") }}
        </Alert>

        <div v-else class="config-cards">
          <Card
            v-for="row in configs"
            :key="row.id"
            header-bg="var(--nb-surface)"
            header-color="var(--nb-ink)"
            class="config-card-item"
          >
            <template #header>
              <div class="config-card-header">
                <span class="config-card-icon">
                  <Database :size="18" />
                </span>

                <div class="config-card-title">
                  <span class="config-card-name">{{
                    toDisplayText(row.name)
                  }}</span>
                </div>
              </div>
            </template>

            <template #header-extra>
              <div class="config-card-tags">
                <Tag type="info" size="small">R2</Tag>
                <Tag :type="getSourceTagType(row.source)" size="small">
                  {{ formatSource(row.source) }}
                </Tag>

                <Tag
                  v-if="row.id === r2Options.default_config_id"
                  type="success"
                  size="small"
                >
                  {{ t("setup.state.defaultTag") }}
                </Tag>
              </div>
            </template>

            <div class="config-detail">
              <div class="kv-group">
                <div class="kv-row">
                  <div class="kv-label">{{ t("setup.labels.bucket") }}</div>
                  <div class="kv-value">
                    <span class="text-ellipsis">
                      {{ toDisplayText(row.bucket_name) }}
                    </span>
                  </div>
                </div>

                <div class="kv-row">
                  <div class="kv-label">Endpoint</div>
                  <div class="kv-value kv-mono">
                    <code class="mono-chip">{{ toDisplayText(row.endpoint) }}</code>
                  </div>
                </div>
              </div>

              <div
                v-if="row.totalSpaceFormatted && row.usedSpaceFormatted"
                class="usage-panel"
              >
                <div class="usage-metrics">
                  <div class="usage-metric">
                    <div class="usage-label">{{ t("setup.labels.totalSpace") }}</div>
                    <div class="usage-value">{{ row.totalSpaceFormatted }}</div>
                  </div>
                  <div class="usage-metric">
                    <div class="usage-label">{{ t("setup.labels.usedSpace") }}</div>
                    <div class="usage-value">{{ row.usedSpaceFormatted }}</div>
                  </div>
                  <div class="usage-metric">
                    <div class="usage-label">{{ t("setup.labels.usagePercent") }}</div>
                    <div
                      class="usage-value"
                      :style="{ color: getUsageColor(row.usagePercent) }"
                    >
                      {{ formatUsagePercent(row.usagePercent) }}
                    </div>
                  </div>
                </div>

                <Progress
                  :percentage="clampProgressPercent(row.usagePercent)"
                  :color="getUsageColor(row.usagePercent)"
                  :height="10"
                  :show-indicator="false"
                />
              </div>

              <div class="kv-divider" />

              <div class="kv-group kv-group-compact">
                <div class="kv-row">
                  <div class="kv-label">{{ t("setup.labels.configId") }}</div>
                  <div class="kv-value kv-mono">
                    <code class="mono-chip">{{ toDisplayText(row.id) }}</code>
                  </div>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="config-actions">
                <Button
                  type="default"
                  size="small"
                  :loading="testingId === row.id"
                  :disabled="loading || testingId === row.id"
                  :aria-label="t('setup.aria.testConnection')"
                  @click="handleTest(row)"
                >
                  <Network :size="14" />
                </Button>

                <div class="action-divider"></div>

                <Button
                  type="default"
                  size="small"
                  :loading="savingDefault && settingDefaultId === row.id"
                  :disabled="
                    loading ||
                    savingDefault ||
                    row.id === r2Options.default_config_id
                  "
                  :aria-label="t('setup.aria.setDefault')"
                  @click="handleSetDefault(row.id)"
                >
                  <Star
                    :size="14"
                    :fill="
                      row.id === r2Options.default_config_id
                        ? 'currentColor'
                        : 'none'
                    "
                  />
                </Button>

                <div class="action-divider"></div>

                <Button
                  type="default"
                  size="small"
                  :disabled="row.source !== 'db'"
                  :aria-label="
                    row.source === 'db'
                      ? t('setup.aria.edit')
                      : t('setup.aria.notEditable')
                  "
                  @click="openEdit(row)"
                >
                  <Pencil :size="14" />
                </Button>

                <template v-if="row.source === 'db'">
                  <Button
                    type="danger"
                    size="small"
                    :aria-label="t('setup.aria.delete')"
                    @click="handleDelete(row)"
                  >
                    <Trash2 :size="14" />
                  </Button>
                </template>
              </div>
            </template>
          </Card>
        </div>
      </section>

      <Modal
        v-model:show="modalVisible"
        :title="modalTitle"
        width="560px"
      >
        <div class="form-grid">
          <FormItem :label="t('setup.labels.name')">
            <Input
              v-model="formValue.name"
              :placeholder="t('setup.placeholders.name')"
            />
          </FormItem>

          <FormItem :label="t('setup.labels.endpoint')">
            <Input
              v-model="formValue.endpoint"
              :placeholder="t('setup.placeholders.endpoint')"
            />
          </FormItem>

          <FormItem :label="t('setup.labels.bucketName')">
            <Input
              v-model="formValue.bucket_name"
              :placeholder="t('setup.placeholders.bucketName')"
            />
          </FormItem>

          <FormItem :label="t('setup.labels.quotaBytes')">
            <Input
              v-model="formValue.quota_bytes"
              type="number"
              :placeholder="t('setup.placeholders.quotaBytes')"
            />
          </FormItem>

          <FormItem
            :label="
              modalMode === 'create'
                ? t('setup.labels.accessKeyId')
                : t('setup.labels.accessKeyIdOptional')
            "
          >
            <Input
              v-model="formValue.access_key_id"
              :placeholder="t('setup.placeholders.accessKeyId')"
            />
          </FormItem>

          <FormItem
            :label="
              modalMode === 'create'
                ? t('setup.labels.secretAccessKey')
                : t('setup.labels.secretAccessKeyOptional')
            "
          >
            <Input
              v-model="formValue.secret_access_key"
              type="password"
              :placeholder="t('setup.placeholders.secretAccessKey')"
            />
          </FormItem>

          <Alert type="info" :title="t('setup.hint.title')">
            <ul class="help-list">
              <li>
                {{ t("setup.hint.endpointFormatPrefix") }}
                <code>https://&lt;account_id&gt;.r2.cloudflarestorage.com</code>
              </li>
              <li>
                {{ t("setup.hint.tokenCreatePrefix") }}
                <strong>R2 → Manage R2 API Tokens</strong>
                {{ t("setup.hint.tokenCreateSuffix") }}
              </li>
            </ul>
          </Alert>
        </div>

        <template #footer>
          <Button type="default" @click="modalVisible = false">
            {{ t("common.cancel") }}
          </Button>
          <Button
            type="primary"
            :loading="modalSubmitting"
            @click="handleSubmit"
          >
            {{ t("setup.modal.save") }}
          </Button>
        </template>
      </Modal>

      <Modal
        v-model:show="usageTipsVisible"
        :title="t('setup.help')"
        width="520px"
      >
        <div class="usage-tips-grid">
          <Alert
            v-for="tip in usageTips"
            :key="tip.key"
            :type="tip.type"
            :title="tip.title"
          >
            {{ tip.content }}
          </Alert>
        </div>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  AlertTriangle,
  Database,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Network,
} from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import api from "../services/api";
import { buildUsageTips } from "../lib/usageTips";
import AppLayout from "../components/layout/AppLayout.vue";
import Card from "../components/ui/card/Card.vue";
import Button from "../components/ui/button/Button.vue";
import Modal from "../components/ui/modal/Modal.vue";
import FormItem from "../components/ui/form-item/FormItem.vue";
import Input from "../components/ui/input/Input.vue";
import Alert from "../components/ui/alert/Alert.vue";
import Tag from "../components/ui/tag/Tag.vue";
import Progress from "../components/ui/progress/Progress.vue";
import { useMessage } from "../composables/useMessage";

const message = useMessage();
const { t } = useI18n({ useScope: "global" });

const loading = ref(false);
const savingDefault = ref(false);

const testingId = ref("");
const settingDefaultId = ref("");

const r2Options = ref({
  default_config_id: null,
  legacy_files_config_id: null,
  options: [],
});

const configs = ref([]);

const modalVisible = ref(false);
const modalMode = ref("create");
const modalSubmitting = ref(false);
const editingId = ref("");
const usageTipsVisible = ref(false);
const usageTips = computed(() => buildUsageTips(t));

const formValue = ref({
  name: "",
  endpoint: "",
  bucket_name: "",
  quota_bytes: "10737418240",
  access_key_id: "",
  secret_access_key: "",
});

const resetForm = () => {
  formValue.value = {
    name: "",
    endpoint: "",
    bucket_name: "",
    quota_bytes: "10737418240",
    access_key_id: "",
    secret_access_key: "",
  };
};

const formatSource = (source) => {
  if (source === "env") return "ENV";
  if (source === "legacy") return "LEGACY";
  return "DB";
};

const getSourceTagType = (source) => {
  if (source === "env") return "info";
  if (source === "legacy") return "warning";
  return "default";
};

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatUsagePercent = (percent) => {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${Math.round(value)}%`;
};

const clampProgressPercent = (percent) => {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(100, value));
};

const getUsageColor = (percent) => {
  const value = Number(percent);
  if (!Number.isFinite(value)) return undefined;
  if (value > 90) return "var(--nb-danger)";
  if (value > 70) return "var(--nb-warning)";
  return "var(--nb-success)";
};

const modalTitle = computed(() => {
  return modalMode.value === "create"
    ? t("setup.modal.createTitle")
    : t("setup.modal.editTitle");
});

const refresh = async () => {
  loading.value = true;
  try {
    const [optionsResult, configsResult] = await Promise.all([
      api.getR2Options(),
      api.getR2Configs(),
    ]);

    r2Options.value = optionsResult;
    configs.value = configsResult.configs || [];
  } catch (error) {
    message.error(error.response?.data?.error || t("setup.messages.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const handleSetDefault = async (id) => {
  if (!id) return;

  try {
    savingDefault.value = true;
    settingDefaultId.value = id;
    await api.setDefaultR2Config(id);
    message.success(t("setup.messages.defaultUpdated"));
    await refresh();
  } catch (error) {
    message.error(
      error.response?.data?.error || t("setup.messages.setDefaultFailed")
    );
  } finally {
    savingDefault.value = false;
    settingDefaultId.value = "";
  }
};

const handleTest = async (row) => {
  try {
    testingId.value = row.id;
    const result = await api.testR2Config(row.id);
    if (result?.success)
      message.success(result.message || t("setup.messages.testSuccess"));
    else message.error(result?.message || t("setup.messages.testFailed"));
  } catch (error) {
    message.error(error.response?.data?.message || t("setup.messages.testFailed"));
  } finally {
    testingId.value = "";
  }
};

const openCreate = () => {
  modalMode.value = "create";
  editingId.value = "";
  resetForm();
  modalVisible.value = true;
};

const openEdit = (row) => {
  modalMode.value = "edit";
  editingId.value = row.id;
  formValue.value = {
    name: row.name || "",
    endpoint: row.endpoint || "",
    bucket_name: row.bucket_name || "",
    quota_bytes: row.totalSpace ? String(row.totalSpace) : "10737418240",
    access_key_id: "",
    secret_access_key: "",
  };
  modalVisible.value = true;
};

const handleSubmit = async () => {
  if (
    !formValue.value.name ||
    !formValue.value.endpoint ||
    !formValue.value.bucket_name ||
    !formValue.value.quota_bytes
  ) {
    message.error(t("setup.validation.required"));
    return;
  }

  const quotaBytes = Number(formValue.value.quota_bytes);
  if (!Number.isFinite(quotaBytes) || quotaBytes <= 0) {
    message.error(t("setup.validation.quotaInvalid"));
    return;
  }

  if (modalMode.value === "create") {
    if (!formValue.value.access_key_id || !formValue.value.secret_access_key) {
      message.error(t("setup.validation.createNeedKeys"));
      return;
    }
  }

  try {
    modalSubmitting.value = true;

    if (modalMode.value === "create") {
      await api.createR2Config({
        name: formValue.value.name,
        endpoint: formValue.value.endpoint,
        access_key_id: formValue.value.access_key_id,
        secret_access_key: formValue.value.secret_access_key,
        bucket_name: formValue.value.bucket_name,
        quota_bytes: quotaBytes,
      });
      message.success(t("setup.messages.createSuccess"));
    } else {
      const payload = {
        name: formValue.value.name,
        endpoint: formValue.value.endpoint,
        bucket_name: formValue.value.bucket_name,
        quota_bytes: quotaBytes,
      };

      if (formValue.value.access_key_id)
        payload.access_key_id = formValue.value.access_key_id;
      if (formValue.value.secret_access_key)
        payload.secret_access_key = formValue.value.secret_access_key;

      await api.updateR2Config(editingId.value, payload);
      message.success(t("setup.messages.updateSuccess"));
    }

    modalVisible.value = false;
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || t("setup.messages.saveFailed"));
  } finally {
    modalSubmitting.value = false;
  }
};

const handleDelete = async (row) => {
  if (!confirm(t("setup.messages.deleteConfirm"))) return;

  try {
    await api.deleteR2Config(row.id);
    message.success(t("setup.messages.deleteSuccess"));
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || t("setup.messages.deleteFailed"));
  }
};

onMounted(() => refresh());
</script>

<style scoped>
.setup-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.setup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.setup-title-group {
  min-width: 0;
}

.setup-title-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.setup-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.setup-help-btn {
  padding: 0 10px;
  height: 32px;
}

.setup-help-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.setup-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.setup-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.config-state {
  text-align: center;
  padding: var(--nb-space-2xl);
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-family: var(--nb-font-ui, var(--nb-font-mono));
}

.config-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--nb-space-lg);
}

.config-card-header {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  min-width: 0;
}

.config-card-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--nb-radius-md, var(--nb-radius));
  background: var(--nb-secondary);
  border: var(--nb-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--nb-warning);
  flex-shrink: 0;
}

:root[data-ui-theme="shadcn"] .config-card-icon {
  background: var(--nb-gray-50);
}

.config-card-title {
  min-width: 0;
  flex: 1;
}

.config-card-name {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold, 600);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.config-detail {
  margin-top: var(--nb-space-sm);
}

.usage-panel {
  margin-top: var(--nb-space-sm);
  padding: var(--nb-space-sm);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-gray-100);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:root[data-ui-theme="shadcn"] .usage-panel {
  background: var(--nb-gray-50);
}

:root[data-ui-theme="shadcn"] .usage-panel :deep(.progress-container) {
  border: 1px solid var(--border);
  box-sizing: border-box;
}

.usage-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.usage-label {
  color: var(--nb-gray-500);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-size: 12px;
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
}

:root[data-ui-theme="shadcn"] .usage-label {
  text-transform: none;
  letter-spacing: 0;
}

.usage-value {
  margin-top: 2px;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 13px;
  color: var(--nb-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kv-group {
  display: flex;
  flex-direction: column;
}

.kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
  padding: 6px 0;
  border-bottom: var(--nb-border);
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-label {
  color: var(--nb-gray-500);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-size: 12px;
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
  flex-shrink: 0;
}

:root[data-ui-theme="shadcn"] .kv-label {
  text-transform: none;
  letter-spacing: 0;
}

.kv-value {
  text-align: right;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--nb-ink);
}

.text-ellipsis {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kv-mono {
  text-align: right;
}

.mono-chip {
  font-family: var(--nb-font-mono);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: var(--nb-radius-sm, var(--nb-radius));
  background: var(--nb-gray-100);
  border: var(--nb-border);
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

:root[data-ui-theme="shadcn"] .mono-chip {
  background: var(--nb-gray-50);
}

.kv-divider {
  border-top: var(--nb-border);
  margin: var(--nb-space-xs) 0;
}

.kv-group-compact .kv-row {
  padding: 4px 0;
}

.config-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.action-divider {
  width: 1px;
  height: 16px;
  background-color: var(--nb-border-color);
  margin: 0 2px;
}

.form-grid {
  display: grid;
  gap: var(--nb-space-md);
}

.form-grid :deep(.brutal-form-item) {
  margin-bottom: 0;
}

.usage-tips-grid {
  display: grid;
  gap: var(--nb-space-md);
}

.help-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
}

.help-list code {
  background: var(--nb-gray-200);
  padding: 2px 6px;
  font-family: var(--nb-font-mono);
  font-size: 13px;
}

@media (max-width: 720px) {
  .setup-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .setup-actions {
    justify-content: flex-start;
  }
}
</style>
