<template>
  <AppLayout>
    <div class="setup-page">
      <header class="setup-header">
        <div class="setup-title-group">
          <h1 class="setup-title">存储管理</h1>
          <p class="setup-subtitle">
            管理多套 Cloudflare R2 配置，你可以在这里管理多套 Cloudflare R2
            配置，并设置默认配置。 上传文件时可选择使用哪套配置。
          </p>
        </div>

        <div class="setup-actions">
          <BrutalButton type="primary" size="large" @click="openCreate">
            <Plus :size="18" style="margin-right: 6px" />
            添加新配置
          </BrutalButton>
          <BrutalButton
            type="default"
            size="large"
            :loading="loading"
            @click="refresh"
          >
            <RefreshCw :size="18" style="margin-right: 6px" />
            刷新列表
          </BrutalButton>
        </div>
      </header>

      <section class="config-list">
        <div v-if="loading" class="config-state">加载中...</div>

        <BrutalAlert
          v-else-if="configs.length === 0"
          type="info"
          title="暂无配置"
        >
          还没有任何 R2 配置，点击“添加新配置”开始创建。
        </BrutalAlert>

        <div v-else class="config-cards">
          <BrutalCard
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
                  <Tooltip :content="toDisplayText(row.name)" as-child>
                    <span class="config-card-name">{{
                      toDisplayText(row.name)
                    }}</span>
                  </Tooltip>
                </div>
              </div>
            </template>

            <template #header-extra>
              <div class="config-card-tags">
                <BrutalTag type="info" size="small">R2</BrutalTag>
                <BrutalTag :type="getSourceTagType(row.source)" size="small">
                  {{ formatSource(row.source) }}
                </BrutalTag>

                <BrutalTag
                  v-if="row.id === r2Options.default_config_id"
                  type="success"
                  size="small"
                >
                  默认
                </BrutalTag>
              </div>
            </template>

            <div class="config-detail">
              <div class="kv-group">
                <div class="kv-row">
                  <div class="kv-label">存储桶</div>
                  <div class="kv-value">
                    <Tooltip :content="toDisplayText(row.bucket_name)" as-child>
                      <span class="text-ellipsis">
                        {{ toDisplayText(row.bucket_name) }}
                      </span>
                    </Tooltip>
                  </div>
                </div>

                <div class="kv-row">
                  <div class="kv-label">Endpoint</div>
                  <div class="kv-value kv-mono">
                    <Tooltip :content="toDisplayText(row.endpoint)" as-child>
                      <code class="mono-chip">{{
                        toDisplayText(row.endpoint)
                      }}</code>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div class="kv-divider" />

              <div class="kv-group kv-group-compact">
                <div class="kv-row">
                  <div class="kv-label">配置 ID</div>
                  <div class="kv-value kv-mono">
                    <Tooltip :content="toDisplayText(row.id)" as-child>
                      <code class="mono-chip">{{ toDisplayText(row.id) }}</code>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="config-actions">
                <Tooltip content="测试连接" as-child>
                  <BrutalButton
                    type="default"
                    size="small"
                    :loading="testingId === row.id"
                    :disabled="loading || testingId === row.id"
                    @click="handleTest(row)"
                  >
                    <Network :size="14" />
                  </BrutalButton>
                </Tooltip>

                <div class="action-divider"></div>

                <Tooltip content="设为默认" as-child>
                  <BrutalButton
                    type="default"
                    size="small"
                    :loading="savingDefault && settingDefaultId === row.id"
                    :disabled="
                      loading ||
                      savingDefault ||
                      row.id === r2Options.default_config_id
                    "
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
                  </BrutalButton>
                </Tooltip>

                <div class="action-divider"></div>

                <Tooltip
                  :content="row.source === 'db' ? '编辑' : '该配置不可修改'"
                  as-child
                >
                  <BrutalButton
                    type="default"
                    size="small"
                    :disabled="row.source !== 'db'"
                    @click="openEdit(row)"
                  >
                    <Pencil :size="14" />
                  </BrutalButton>
                </Tooltip>

                <template v-if="row.source === 'db'">
                  <Tooltip content="删除" as-child>
                    <BrutalButton
                      type="danger"
                      size="small"
                      @click="handleDelete(row)"
                    >
                      <Trash2 :size="14" />
                    </BrutalButton>
                  </Tooltip>
                </template>
              </div>
            </template>
          </BrutalCard>
        </div>
      </section>

      <BrutalModal
        v-model:show="modalVisible"
        :title="modalTitle"
        width="560px"
      >
        <div class="form-grid">
          <BrutalFormItem label="名称">
            <BrutalInput
              v-model="formValue.name"
              placeholder="例如：生产环境"
            />
          </BrutalFormItem>

          <BrutalFormItem label="R2 端点 URL">
            <BrutalInput
              v-model="formValue.endpoint"
              placeholder="https://<account_id>.r2.cloudflarestorage.com"
            />
          </BrutalFormItem>

          <BrutalFormItem label="Bucket Name">
            <BrutalInput
              v-model="formValue.bucket_name"
              placeholder="存储桶名称"
            />
          </BrutalFormItem>

          <BrutalFormItem
            :label="
              modalMode === 'create'
                ? 'Access Key ID'
                : 'Access Key ID（留空不更新）'
            "
          >
            <BrutalInput
              v-model="formValue.access_key_id"
              placeholder="R2 访问密钥 ID"
            />
          </BrutalFormItem>

          <BrutalFormItem
            :label="
              modalMode === 'create'
                ? 'Secret Access Key'
                : 'Secret Access Key（留空不更新）'
            "
          >
            <BrutalInput
              v-model="formValue.secret_access_key"
              type="password"
              placeholder="R2 访问密钥"
            />
          </BrutalFormItem>

          <BrutalAlert type="info" title="提示">
            <ul class="help-list">
              <li>
                R2 端点 URL 格式为
                <code>https://&lt;account_id&gt;.r2.cloudflarestorage.com</code>
              </li>
              <li>
                访问密钥请在 Cloudflare Dashboard 的
                <strong>R2 → Manage R2 API Tokens</strong> 中创建（需要 Object
                Read/Write）。
              </li>
            </ul>
          </BrutalAlert>
        </div>

        <template #footer>
          <BrutalButton type="default" @click="modalVisible = false">
            取消
          </BrutalButton>
          <BrutalButton
            type="primary"
            :loading="modalSubmitting"
            @click="handleSubmit"
          >
            保存
          </BrutalButton>
        </template>
      </BrutalModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  Database,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Network,
} from "lucide-vue-next";
import api from "../services/api";
import AppLayout from "../components/layout/AppLayout.vue";
import BrutalCard from "../components/ui/card/BrutalCard.vue";
import BrutalButton from "../components/ui/button/BrutalButton.vue";
import BrutalModal from "../components/ui/modal/BrutalModal.vue";
import BrutalFormItem from "../components/ui/form-item/BrutalFormItem.vue";
import BrutalInput from "../components/ui/input/BrutalInput.vue";
import BrutalAlert from "../components/ui/alert/BrutalAlert.vue";
import BrutalTag from "../components/ui/tag/BrutalTag.vue";
import Tooltip from "../components/ui/tooltip/Tooltip.vue";
import { useMessage } from "../composables/useMessage";

const message = useMessage();

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

const formValue = ref({
  name: "",
  endpoint: "",
  bucket_name: "",
  access_key_id: "",
  secret_access_key: "",
});

const resetForm = () => {
  formValue.value = {
    name: "",
    endpoint: "",
    bucket_name: "",
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

const modalTitle = computed(() => {
  return modalMode.value === "create" ? "新增 R2 配置" : "编辑 R2 配置";
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
    message.error(error.response?.data?.error || "加载 R2 配置失败");
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
    message.success("默认配置已更新");
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || "设置默认配置失败");
  } finally {
    savingDefault.value = false;
    settingDefaultId.value = "";
  }
};

const handleTest = async (row) => {
  try {
    testingId.value = row.id;
    const result = await api.testR2Config(row.id);
    if (result?.success) message.success(result.message || "连接测试成功");
    else message.error(result?.message || "连接测试失败");
  } catch (error) {
    message.error(error.response?.data?.message || "连接测试失败");
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
    access_key_id: "",
    secret_access_key: "",
  };
  modalVisible.value = true;
};

const handleSubmit = async () => {
  if (
    !formValue.value.name ||
    !formValue.value.endpoint ||
    !formValue.value.bucket_name
  ) {
    message.error("请填写名称、端点和 Bucket");
    return;
  }

  if (modalMode.value === "create") {
    if (!formValue.value.access_key_id || !formValue.value.secret_access_key) {
      message.error("新增配置需要填写 Access Key 和 Secret Key");
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
      });
      message.success("配置创建成功");
    } else {
      const payload = {
        name: formValue.value.name,
        endpoint: formValue.value.endpoint,
        bucket_name: formValue.value.bucket_name,
      };

      if (formValue.value.access_key_id)
        payload.access_key_id = formValue.value.access_key_id;
      if (formValue.value.secret_access_key)
        payload.secret_access_key = formValue.value.secret_access_key;

      await api.updateR2Config(editingId.value, payload);
      message.success("配置已更新");
    }

    modalVisible.value = false;
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || "保存失败");
  } finally {
    modalSubmitting.value = false;
  }
};

const handleDelete = async (row) => {
  if (!confirm("确定删除该配置？（删除前请确保没有关联文件）")) return;

  try {
    await api.deleteR2Config(row.id);
    message.success("配置已删除");
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || "删除配置失败");
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

.setup-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
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
}

.config-detail {
  margin-top: var(--nb-space-sm);
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
