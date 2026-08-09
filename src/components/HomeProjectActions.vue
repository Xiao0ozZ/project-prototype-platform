<script setup>
import { computed } from 'vue';

const props = defineProps({
  canTransfer: {
    type: Boolean,
    default: false,
  },
  tone: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark'].includes(value),
  },
});

const emit = defineEmits(['manage', 'transfer']);

const actionClass = computed(() =>
  props.tone === 'dark'
    ? 'text-slate-300 hover:text-white focus-visible:outline-white/70'
    : 'text-slate-600 hover:text-blue-600 focus-visible:outline-blue-500/70',
);
</script>

<template>
  <div class="contents">
    <button
      type="button"
      class="rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      :class="actionClass"
      @click="emit('manage')"
    >
      项目管理
    </button>
    <button
      type="button"
      class="rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
      :class="actionClass"
      :disabled="!canTransfer"
      :title="canTransfer ? '导入或导出当前项目页面' : '请先选择项目'"
      @click="emit('transfer')"
    >
      导入导出
    </button>
  </div>
</template>
