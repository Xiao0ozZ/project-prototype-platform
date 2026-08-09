<template>
  <AppShell
    v-if="project && client"
    :project-id="project.id"
    :app-name="project.name"
    :client="client.id"
    :client-name="client.name"
    :menus="menus"
    :layout-type="layoutType"
  />
</template>

<script setup>
import { computed } from 'vue';

import AppShell from '../components/AppShell.vue';
import { createProjectMenus, getProject, getProjectClient } from '../config/project-packages';
import { getClientLayoutType } from '../services/project-navigation';

const props = defineProps({
  projectId: { type: String, required: true },
  clientId: { type: String, required: true },
});

const project = computed(() => getProject(props.projectId));
const client = computed(() => getProjectClient(props.projectId, props.clientId));
const menus = computed(() => createProjectMenus(props.projectId, props.clientId));
const layoutType = computed(() => getClientLayoutType(client.value));
</script>
