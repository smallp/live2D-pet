<script setup lang="ts">
</script>

<template>
  <div class="flex-center" style="background-color: red;height: 100px;width: 100px;">
  </div>
</template>

<style>
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
html, body {
  width: 100%;
  height: 100%;
  background: transparent !important; /* 覆盖所有默认背景 */
  overflow: hidden; /* 隐藏滚动条（避免滚动条背景） */
}
</style>
