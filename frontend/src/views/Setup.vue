<template>
  <AppLayout>
    <BrutalCard title="R2 配置管理">
      <template #header-extra>
        <BrutalButton type="primary" size="small" @click="openCreate">
          新增配置
        </BrutalButton>
      </template>

      <BrutalAlert type="info" title="说明" class="intro">
        你可以在这里管理多套 Cloudflare R2 配置，并设置默认配置。
        上传文件时可选择使用哪套配置；环境变量配置不会锁死 UI 配置。
      </BrutalAlert>

      <div class="controls">
        <div class="control-item">
          <BrutalFormItem label="默认配置">
            <BrutalSelect
              v-model="defaultConfigId"
              :options="selectOptions"
              :disabled="loading || savingDefault"
            />
          </BrutalFormItem>
          <div class="control-actions">
            <BrutalButton
              type="default"
              size="small"
              :loading="savingDefault"
              :disabled="loading || savingDefault || !defaultConfigId"
              @click="handleSetDefault()"
            >
              设为默认
            </BrutalButton>
          </div>
        </div>

        <div class="control-item">
          <BrutalFormItem label="旧 key 文件映射配置">
            <BrutalSelect
              v-model="legacyFilesConfigId"
              :options="legacySelectOptions"
              :disabled="loading || savingLegacyFiles"
            />
          </BrutalFormItem>
          <div class="control-actions">
            <BrutalButton
              type="default"
              size="small"
              :loading="savingLegacyFiles"
              :disabled="loading || savingLegacyFiles"
              @click="handleSetLegacyFiles()"
            >
              保存映射
            </BrutalButton>
          </div>
        </div>
      </div>

      <BrutalDivider />

      <BrutalTable :columns="columns" :data="configs" :loading="loading" />

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
          <BrutalButton type="default" @click="modalVisible = false"
            >取消</BrutalButton
          >
          <BrutalButton
            type="primary"
            :loading="modalSubmitting"
            @click="handleSubmit"
          >
            保存
          </BrutalButton>
        </template>
      </BrutalModal>
    </BrutalCard>
  </AppLayout>
</template>

<script setup>
import { ref, computed, h, onMounted } from "vue";
import api from "../services/api";
import AppLayout from "../components/layout/AppLayout.vue";
import BrutalCard from "../components/ui/BrutalCard.vue";
import BrutalButton from "../components/ui/BrutalButton.vue";
import BrutalTable from "../components/ui/BrutalTable.vue";
import BrutalModal from "../components/ui/BrutalModal.vue";
import BrutalFormItem from "../components/ui/BrutalFormItem.vue";
import BrutalInput from "../components/ui/BrutalInput.vue";
import BrutalSelect from "../components/ui/BrutalSelect.vue";
import BrutalDivider from "../components/ui/BrutalDivider.vue";
import BrutalAlert from "../components/ui/BrutalAlert.vue";
import BrutalTag from "../components/ui/BrutalTag.vue";
import { useMessage } from "../composables/useMessage";

const message = useMessage();

const loading = ref(false);
const savingDefault = ref(false);
const savingLegacyFiles = ref(false);

const r2Options = ref({
  default_config_id: null,
  legacy_files_config_id: null,
  options: [],
});

const configs = ref([]);

const defaultConfigId = ref("");
const legacyFilesConfigId = ref("");

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

const formatSource = (source) => {
  if (source === "env") return "环境变量";
  if (source === "legacy") return "旧版";
  return "数据库";
};

const resetForm = () => {
  formValue.value = {
    name: "",
    endpoint: "",
    bucket_name: "",
    access_key_id: "",
    secret_access_key: "",
  };
};

const modalTitle = computed(() => {
  return modalMode.value === "create" ? "新增 R2 配置" : "编辑 R2 配置";
});

const selectOptions = computed(() => {
  return (r2Options.value.options || []).map((opt) => ({
    label: `${opt.name}（${formatSource(opt.source)}）`,
    value: opt.id,
  }));
});

const legacySelectOptions = computed(() => {
  return [
    { label: "未设置（自动识别/回退）", value: "" },
    ...selectOptions.value,
  ];
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

    defaultConfigId.value = optionsResult.default_config_id || "";
    legacyFilesConfigId.value = optionsResult.legacy_files_config_id || "";
  } catch (error) {
    message.error(error.response?.data?.error || "加载 R2 配置失败");
  } finally {
    loading.value = false;
  }
};

const handleSetDefault = async (id) => {
  const targetId = id || defaultConfigId.value;
  if (!targetId) return;

  try {
    savingDefault.value = true;
    await api.setDefaultR2Config(targetId);
    message.success("默认配置已更新");
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || "设置默认配置失败");
  } finally {
    savingDefault.value = false;
  }
};

const handleSetLegacyFiles = async (id) => {
  const raw = id !== undefined ? id : legacyFilesConfigId.value;
  const targetId = raw && String(raw).trim() ? raw : null;

  try {
    savingLegacyFiles.value = true;
    await api.setLegacyFilesR2Config(targetId);
    message.success("旧文件映射已更新");
    await refresh();
  } catch (error) {
    message.error(error.response?.data?.error || "设置旧文件映射失败");
  } finally {
    savingLegacyFiles.value = false;
  }
};

const handleTest = async (row) => {
  try {
    const result = await api.testR2Config(row.id);
    if (result?.success) message.success(result.message || "连接测试成功");
    else message.error(result?.message || "连接测试失败");
  } catch (error) {
    message.error(error.response?.data?.message || "连接测试失败");
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

const columns = computed(() => {
  return [
    {
      title: "名称",
      key: "name",
      render: (row) => {
        const tags = [];

        if (row.id === r2Options.value.default_config_id) {
          tags.push(
            h(BrutalTag, { type: "success", size: "small" }, () => "默认")
          );
        }

        if (row.id === r2Options.value.legacy_files_config_id) {
          tags.push(
            h(BrutalTag, { type: "warning", size: "small" }, () => "旧文件")
          );
        }

        const sourceTagType =
          row.source === "env"
            ? "info"
            : row.source === "legacy"
            ? "warning"
            : "default";
        tags.push(
          h(BrutalTag, { type: sourceTagType, size: "small" }, () =>
            formatSource(row.source)
          )
        );

        return h(
          "div",
          {
            style: "display:flex; align-items:center; gap:8px; flex-wrap:wrap;",
          },
          [h("span", { style: "font-weight:700;" }, row.name || "-"), ...tags]
        );
      },
    },
    {
      title: "Endpoint",
      key: "endpoint",
      render: (row) => h("span", row.endpoint || "-"),
    },
    {
      title: "Bucket",
      key: "bucket_name",
      width: 160,
      render: (row) => h("span", row.bucket_name || "-"),
    },
    {
      title: "操作",
      key: "actions",
      width: 360,
      render: (row) => {
        const actions = [
          h(
            BrutalButton,
            { size: "small", type: "default", onClick: () => handleTest(row) },
            () => "测试"
          ),
        ];

        actions.push(
          h(
            BrutalButton,
            {
              size: "small",
              type:
                row.id === r2Options.value.default_config_id
                  ? "secondary"
                  : "primary",
              disabled: row.id === r2Options.value.default_config_id,
              onClick: () => handleSetDefault(row.id),
            },
            () => "设默认"
          )
        );

        actions.push(
          h(
            BrutalButton,
            {
              size: "small",
              type:
                row.id === r2Options.value.legacy_files_config_id
                  ? "secondary"
                  : "default",
              disabled: row.id === r2Options.value.legacy_files_config_id,
              onClick: () => handleSetLegacyFiles(row.id),
            },
            () => "设旧文件"
          )
        );

        if (row.source === "db") {
          actions.push(
            h(
              BrutalButton,
              { size: "small", type: "default", onClick: () => openEdit(row) },
              () => "编辑"
            )
          );
          actions.push(
            h(
              BrutalButton,
              {
                size: "small",
                type: "danger",
                onClick: () => handleDelete(row),
              },
              () => "删除"
            )
          );
        }

        return h(
          "div",
          { style: "display:flex; gap:8px; flex-wrap:wrap;" },
          actions
        );
      },
    },
  ];
});

onMounted(() => refresh());
</script>

<style scoped>
.intro {
  margin-bottom: var(--nb-space-lg);
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--nb-space-lg);
}

.control-item {
  border: 2px dashed var(--nb-black);
  padding: var(--nb-space-md);
  background: var(--nb-white);
}

.control-actions {
  display: flex;
  justify-content: flex-end;
}

.form-grid {
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

@media (max-width: 960px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>
