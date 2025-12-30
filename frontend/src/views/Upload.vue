<template>
  <AppLayout>
    <Card title="上传文件">
      <UploadPanel />
    </Card>
  </AppLayout>
</template>

<script setup>
import AppLayout from "../components/layout/AppLayout.vue";
import Card from "../components/ui/card/Card.vue";
import UploadPanel from "../components/upload/UploadPanel.vue";
</script>
