<script setup lang="ts">
import { LabType, type AdminLabDetailDto, type UpdateLabInput } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../../components/AdminKpiCard.vue'
import DomainPageShell from '../../components/DomainPageShell.vue'
import AgentLabEditor from '../../components/labs/AgentLabEditor.vue'
import CommandLabEditor from '../../components/labs/CommandLabEditor.vue'
import DeploymentLabEditor from '../../components/labs/DeploymentLabEditor.vue'
import HardwareLabEditor from '../../components/labs/HardwareLabEditor.vue'
import ProjectLabEditor from '../../components/labs/ProjectLabEditor.vue'
import { useDraftEditor } from '../../composables/useDraftEditor'
import { usePagedList } from '../../composables/usePagedList'
import { usePermissionAction } from '../../composables/usePermissionAction'
import { usePublishAction } from '../../composables/usePublishAction'
import { api } from '../../services/api'

const list = usePagedList('labs')
const { result, keyword, status, dataOrigin, loading, error, selected } = list
const drafts = useDraftEditor('labs')
const publishing = usePublishAction('labs')
const canWrite = usePermissionAction('lab.write')
const canPublish = usePermissionAction('lab.publish')
const dialog = ref(false)
const detail = ref<AdminLabDetailDto | null>(null)
const fields = reactive<{ labType: LabType; category: string; level: string; durationMinutes: number; objective: string; task: string; resultSubmission: string; hints: string }>({ labType: LabType.AGENT, category: '', level: '', durationMinutes: 0, objective: '', task: '', resultSubmission: '', hints: '' })
const step = reactive({ stepKey: '', title: '', description: '', action: 'confirm', validatorField: '', expected: '', score: 10 })
const tools = ref<Array<{ name: string; toolType: string; description: string; enabled: boolean }>>([])
const typeConfig = ref<Record<string, unknown>>({})
const typeEditors = { agent: AgentLabEditor, deployment: DeploymentLabEditor, command: CommandLabEditor, hardware: HardwareLabEditor, project: ProjectLabEditor }
const activeTypeEditor = computed(() => typeEditors[fields.labType])
watch(list.selected, async (item) => {
  if (!item) return
  const loaded = await api<AdminLabDetailDto>(`/admin/labs/${item.databaseId}`)
  detail.value = loaded
  Object.assign(fields, {
    labType: loaded.labType || LabType.AGENT,
    category: String(item.data.category || ''),
    level: String(item.data.level || ''),
    durationMinutes: Number(item.data.durationMinutes || 0),
    objective: String(item.data.objective || ''),
    task: String(item.data.task || ''),
    resultSubmission: String(item.data.resultSubmission || ''),
    hints: Array.isArray(item.data.hints) ? item.data.hints.join('\n') : '',
  })
  tools.value = loaded.tools.map((tool) => ({ ...tool, enabled: true }))
  typeConfig.value = { ...(loaded.data.typeConfig || {}) }
})
onMounted(() => void list.load(1))
const create = async (value: { slug: string; title: string; summary: string; coverAssetId: string | null }) => { await drafts.createDraft({ ...value, labType: LabType.AGENT }); dialog.value = false; await list.load(1); ElMessage.success('实训草稿已创建') }
const save = async (base: { title: string; summary: string; sortOrder: number; coverAssetId?: string | null }) => {
  if (!list.selected.value) return
  const input: UpdateLabInput = { ...base, ...fields, hints: fields.hints.split('\n').filter(Boolean), typeConfig: typeConfig.value }
  await drafts.saveDraft(list.selected.value, input)
  await api(`/admin/labs/${list.selected.value.databaseId}/tools`, { method: 'PUT', body: JSON.stringify({ tools: tools.value }) })
  await list.load(); ElMessage.success('实训定义与工具环境已保存')
}
const addStep = async () => {
  if (!list.selected.value) return
  const validator = step.validatorField ? { field: step.validatorField, expected: step.expected } : {}
  await api(`/admin/labs/${list.selected.value.databaseId}/steps`, {
    method: 'POST',
    body: JSON.stringify({ stepKey: step.stepKey, title: step.title, description: step.description, sortOrder: detail.value?.steps.length || 0, instruction: { action: step.action }, validator, score: step.score }),
  })
  detail.value = await api<AdminLabDetailDto>(`/admin/labs/${list.selected.value.databaseId}`)
  Object.assign(step, { stepKey: '', title: '', description: '', validatorField: '', expected: '', score: 10 })
  ElMessage.success('结构化实训步骤已加入草稿')
}
const updateStep = async (item: AdminLabDetailDto['steps'][number]) => {
  if (!list.selected.value) return
  await api(`/admin/labs/${list.selected.value.databaseId}/steps/${item.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: item.title, description: item.description, instruction: item.instruction, validator: item.validator, score: item.score }),
  })
  ElMessage.success('实训步骤已更新')
}
const removeStep = async (id: string) => {
  if (!list.selected.value) return
  await api(`/admin/labs/${list.selected.value.databaseId}/steps/${id}`, { method: 'DELETE' })
  detail.value = await api<AdminLabDetailDto>(`/admin/labs/${list.selected.value.databaseId}`)
}
const moveStep = async (index: number, offset: number) => {
  if (!list.selected.value || !detail.value) return
  const next = index + offset
  if (next < 0 || next >= detail.value.steps.length) return
  const ordered = [...detail.value.steps]
  ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
  await api(`/admin/labs/${list.selected.value.databaseId}/steps/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ items: ordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }),
  })
  detail.value = await api<AdminLabDetailDto>(`/admin/labs/${list.selected.value.databaseId}`)
}
const addTool = () => tools.value.push({ name: '', toolType: fields.labType, description: '', enabled: true })
const publish = async () => { if (list.selected.value) { await publishing.publish(list.selected.value); await list.load(); ElMessage.success('实训版本已发布') } }
const archive = async () => { if (list.selected.value) { await publishing.archive(list.selected.value); await list.load(); ElMessage.success('实训已下架') } }
</script>

<template>
  <DomainPageShell content-type="lab" :category-key="fields.labType" :data-origin="dataOrigin" @update:data-origin="list.dataOrigin.value = $event" @remove="drafts.removeDraft(selected, () => list.load())" v-model:dialog="dialog" title="实训项目管理" description="配置受控实训类型、步骤、动作、校验与工具环境" noun="实训" icon="lab" :result="result" :selected="selected" :keyword="keyword" :status="status" :loading="loading" :error="error" :can-write="canWrite" :can-publish="canPublish" @update:keyword="list.keyword.value = $event" @update:status="list.status.value = $event" @select="list.select" @page="list.load" @retry="list.load()" @create="create" @save="save" @publish="publish" @archive="archive">
    <template #kpis><div class="kpi-grid"><AdminKpiCard icon="lab" label="实训总数" :value="result.total" color="#3478f6" /><AdminKpiCard icon="check" label="已发布" :value="result.items.filter((item) => item.status === 'published').length" color="#22b66c" /><AdminKpiCard icon="theme" label="当前步骤" :value="detail?.steps.length || 0" color="#ff4d1f" /><AdminKpiCard icon="tool" label="当前工具" :value="tools.length" color="#7c4dff" /></div></template>
    <template #detail><p>{{ detail?.labType || '尚未配置' }} · {{ detail?.steps.length || 0 }} 个服务端校验步骤</p></template>
    <template #editor>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <section class="domain-section"><h3>实训定义</h3><label>实训类型<select v-model="fields.labType"><option v-for="type in ['agent','deployment','command','hardware','project']" :key="type">{{ type }}</option></select></label><label>分类<input v-model="fields.category" /></label><label>难度<input v-model="fields.level" /></label><label>预计分钟<input v-model.number="fields.durationMinutes" type="number" min="0" /></label><label>目标说明<textarea v-model="fields.objective" rows="2" /></label><label>任务说明<textarea v-model="fields.task" rows="3" /></label><label>提示（每行一条）<textarea v-model="fields.hints" rows="3" /></label><label>结果提交方式<input v-model="fields.resultSubmission" /></label></section>
      <component :is="activeTypeEditor" v-model="typeConfig" />
      <section class="domain-section"><h3>实训步骤编辑</h3><label>步骤 key<input v-model="step.stepKey" /></label><label>标题<input v-model="step.title" /></label><label>说明<input v-model="step.description" /></label><label>允许动作<select v-model="step.action"><option v-for="action in ['command','input','select_tool','connect','confirm','submit_step']" :key="action">{{ action }}</option></select></label><label>校验字段<input v-model="step.validatorField" /></label><label>期望值<input v-model="step.expected" :disabled="!step.validatorField" /></label><label>分值<input v-model.number="step.score" type="number" min="0" max="100" /></label><button class="admin-secondary" type="button" @click="addStep">添加步骤</button><div v-for="(item, index) in detail?.steps || []" :key="item.id" class="stage-editor"><label>标题<input v-model="item.title" /></label><label>说明<textarea v-model="item.description" /></label><label>分值<input v-model.number="item.score" type="number" min="0" max="100" /></label><button class="text-link" type="button" @click="updateStep(item)">保存</button><button class="text-link" type="button" :disabled="index === 0" @click="moveStep(index, -1)">上移</button><button class="text-link" type="button" :disabled="index === (detail?.steps.length || 0) - 1" @click="moveStep(index, 1)">下移</button><button class="admin-danger" type="button" @click="removeStep(item.id)">删除</button></div></section>
      <section class="domain-section"><h3>工具环境 <button class="text-link" type="button" @click="addTool">添加工具</button></h3><div v-for="(tool, index) in tools" :key="index" class="stage-editor"><label>名称<input v-model="tool.name" /></label><label>类型<input v-model="tool.toolType" /></label><label>说明<input v-model="tool.description" /></label><label class="toggle-row">启用<el-switch v-model="tool.enabled" /></label><button class="admin-danger" type="button" @click="tools.splice(index, 1)">移除</button></div></section>
      </fieldset>
    </template>
  </DomainPageShell>
</template>
