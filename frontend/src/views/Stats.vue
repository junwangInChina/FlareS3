<template>
  <AppLayout>
    <Card title="存储空间使用情况">
      <template #header-extra>
        <Button type="default" size="small" @click="loadStats">刷新</Button>
      </template>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="stats" class="stats-content">
        <div class="progress-section">
          <Progress
            type="circle"
            :percentage="stats.usagePercent"
            :color="getProgressColor(stats.usagePercent)"
          >
            <div class="progress-inner">
              <span class="percentage">{{ Math.round(stats.usagePercent) }}%</span>
              <span class="label">已使用</span>
            </div>
          </Progress>
        </div>

        <Descriptions
          :items="[
            { label: '已用空间', value: stats.usedSpaceFormatted },
            { label: '总空间', value: stats.totalSpaceFormatted },
            { label: '文件数量', value: stats.fileCount },
            { label: '今日过期', value: stats.expiringToday },
            { label: '本周过期', value: stats.expiringThisWeek }
          ]"
          :column="2"
        />
      </div>
    </Card>

    <Card
      title="使用提示"
      header-bg="var(--nb-secondary)"
      header-color="var(--nb-ink)"
    >
      <div class="tips-grid">
        <Alert type="warning" title="用量说明">
          显示的存储用量基于本地数据库统计，可能与 R2 实际用量存在差异。
        </Alert>
        <Alert type="info" title="存储空间">
          当前使用 Cloudflare R2 免费层，总容量 10GB。超出后可能产生费用。
        </Alert>
        <Alert type="warning" title="文件过期">
          文件会根据设置的过期时间自动删除，请及时下载重要文件。
        </Alert>
        <Alert type="success" title="流量说明">
          R2 不收取出站流量费用，下载文件完全免费。
        </Alert>
      </div>
    </Card>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from "../components/ui/card/Card.vue"
import Button from "../components/ui/button/Button.vue"
import Progress from "../components/ui/progress/Progress.vue"
import Descriptions from "../components/ui/descriptions/Descriptions.vue"
import Alert from "../components/ui/alert/Alert.vue"
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const loading = ref(false)
const stats = ref(null)

const getProgressColor = (percent) => {
  if (percent > 90) return 'var(--nb-danger)'
  if (percent > 70) return 'var(--nb-warning)'
  return 'var(--nb-success)'
}

const loadStats = async () => {
  loading.value = true
  try {
    stats.value = await api.getStats()
  } catch (error) {
    message.error('加载存储统计失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStats())
</script>

<style scoped>
.loading {
  text-align: center;
  padding: var(--nb-space-2xl);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-xl);
}

.progress-section {
  display: flex;
  justify-content: center;
  padding: var(--nb-space-lg) 0;
}

.progress-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.percentage {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 24px;
}

.label {
  font-size: 12px;
  color: var(--nb-gray-500);
  margin-top: 4px;
}

.tips-grid {
  display: grid;
  gap: var(--nb-space-md);
}
</style>
