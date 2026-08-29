<script setup lang="ts">
import type { CatalogItemDto } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../services/api'

interface QuestionBank { id: string; name: string; _count: { questions: number } }
interface FileRecord { id: string; originalName: string }

const props = defineProps<{ kind: string; item: CatalogItemDto | null }>()
const emit = defineEmits<{ updated: [] }>()
const busy = ref(false)
const banks = ref<QuestionBank[]>([])
const file = ref<File | null>(null)
const form = reactive({
  title: '',
  description: '',
  stageNames: '入门,实践,进阶',
  stepKey: '',
  scheduleAt: '',
  positionKey: 'ai-frontier-featured',
  bankId: '',
  questionStem: '',
  questionAnswer: '',
})
const databaseId = computed(() => props.item?.databaseId || '')

const reset = () => {
  form.title = props.item ? `${props.item.title}内容` : ''
  form.description = props.item?.summary || ''
  form.stepKey = props.item ? `${props.item.slug}-step` : ''
}
watch(() => props.item, reset, { immediate: true })

const run = async (task: () => Promise<void>, message: string) => {
  busy.value = true
  try {
    await task()
    emit('updated')
    ElMessage.success(message)
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '操作失败')
  } finally {
    busy.value = false
  }
}

const saveThemePath = () => run(async () => {
  await api(`/admin/themes/${databaseId.value}/path`, {
    method: 'PUT',
    body: JSON.stringify({
      name: `${props.item?.title}学习路径`,
      description: form.description,
      stages: form.stageNames.split(',').map((name) => ({ name: name.trim(), stageType: 'learning' })).filter((item) => item.name),
    }),
  })
}, '学习路径已保存')

const addCourseLesson = () => run(async () => {
  const chapter = await api<{ id: string }>(`/admin/courses/${databaseId.value}/chapters`, {
    method: 'POST',
    body: JSON.stringify({ title: form.title, description: form.description, sortOrder: 0 }),
  })
  const lesson = await api<{ id: string }>(`/admin/chapters/${chapter.id}/lessons`, {
    method: 'POST',
    body: JSON.stringify({ title: form.title, summary: form.description, lessonType: 'article', durationMinutes: 10, sortOrder: 0 }),
  })
  await api(`/admin/lessons/${lesson.id}/blocks`, {
    method: 'POST',
    body: JSON.stringify({ blockType: 'paragraph', sortOrder: 0, content: { text: form.description } }),
  })
}, '结构化章节、课时和内容块已加入当前草稿')

const addLabStep = () => run(async () => {
  await api(`/admin/labs/${databaseId.value}/steps`, {
    method: 'POST',
    body: JSON.stringify({
      stepKey: form.stepKey,
      title: form.title,
      description: form.description,
      instruction: { action: 'observe' },
      validator: { type: 'confirmation' },
      score: 10,
    }),
  })
}, '实训步骤已保存')

const uploadResource = () => run(async () => {
  if (!file.value) throw new Error('请先选择文件')
  const body = new FormData()
  body.set('file', file.value)
  body.set('visibility', 'public')
  const uploaded = await api<FileRecord>('/admin/files/upload', { method: 'POST', body })
  await api(`/admin/resources/${databaseId.value}`, {
    method: 'PATCH',
    body: JSON.stringify({ payload: { fileId: uploaded.id, category: '学习手册', format: file.value.name.split('.').pop()?.toUpperCase() || 'FILE', visibility: 'public' } }),
  })
}, '文件已上传并绑定到资源草稿')

const scheduleArticle = () => run(async () => {
  if (!form.scheduleAt) throw new Error('请选择发布时间')
  await api(`/admin/articles/${databaseId.value}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(form.scheduleAt).toISOString() }) })
  await api(`/admin/articles/${databaseId.value}/recommendations`, {
    method: 'PUT',
    body: JSON.stringify({ items: [{ positionKey: form.positionKey, sortOrder: 0, enabled: true }] }),
  })
}, '文章已进入定时发布并配置推荐位')

const loadBanks = async () => {
  if (props.kind !== 'challenges') return
  banks.value = await api('/admin/question-banks')
  form.bankId ||= banks.value[0]?.id || ''
}
onMounted(loadBanks)
watch(() => props.kind, loadBanks)

const createAndLinkBank = () => run(async () => {
  let bankId = form.bankId
  if (!bankId) {
    const bank = await api<QuestionBank>('/admin/question-banks', { method: 'POST', body: JSON.stringify({ name: `${props.item?.title}题库` }) })
    bankId = bank.id
    form.bankId = bank.id
  }
  await api(`/admin/challenges/${databaseId.value}/question-bank`, { method: 'PUT', body: JSON.stringify({ questionBankId: bankId }) })
  await loadBanks()
}, '题库已关联')

const addQuestion = () => run(async () => {
  if (!form.bankId) throw new Error('请先关联题库')
  const question = await api<{ id: string }>('/admin/questions', {
    method: 'POST',
    body: JSON.stringify({
      bankId: form.bankId,
      questionType: 'single',
      difficulty: '基础',
      stem: form.questionStem,
      options: [{ key: 'A', text: form.questionAnswer }, { key: 'B', text: '以上皆非' }],
      standardAnswer: 'A',
      analysis: '由管理端题库维护。',
    }),
  })
  await api(`/admin/questions/${question.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) })
  form.questionStem = ''
  form.questionAnswer = ''
  await loadBanks()
}, '题目已创建并发布')
</script>

<template>
  <section v-if="item" class="management-tools">
    <h3>高级内容配置</h3>
    <p>结构化内容会写入当前草稿；发布后才进入学生端。</p>
    <form v-if="kind === 'themes'" @submit.prevent="saveThemePath">
      <label>路径阶段（逗号分隔）<input v-model="form.stageNames" required /></label>
      <button class="admin-secondary" type="submit" :disabled="busy">保存学习路径</button>
    </form>
    <form v-else-if="kind === 'courses'" @submit.prevent="addCourseLesson">
      <label>章节与课时标题<input v-model="form.title" required minlength="2" /></label>
      <label>内容段落<textarea v-model="form.description" required minlength="2" rows="3" /></label>
      <button class="admin-secondary" type="submit" :disabled="busy">加入结构化课时</button>
    </form>
    <form v-else-if="kind === 'labs'" @submit.prevent="addLabStep">
      <label>步骤标识<input v-model="form.stepKey" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label>步骤标题<input v-model="form.title" required minlength="2" /></label>
      <button class="admin-secondary" type="submit" :disabled="busy">新增实训步骤</button>
    </form>
    <form v-else-if="kind === 'resources'" @submit.prevent="uploadResource">
      <label>资源文件<input type="file" required @change="file = ($event.target as HTMLInputElement).files?.[0] || null" /></label>
      <button class="admin-secondary" type="submit" :disabled="busy">上传并绑定</button>
    </form>
    <form v-else-if="kind === 'articles'" @submit.prevent="scheduleArticle">
      <label>定时发布<input v-model="form.scheduleAt" type="datetime-local" required /></label>
      <label>推荐位标识<input v-model="form.positionKey" required /></label>
      <button class="admin-secondary" type="submit" :disabled="busy">保存定时与推荐位</button>
    </form>
    <template v-else-if="kind === 'challenges'">
      <form @submit.prevent="createAndLinkBank">
        <label>关联题库<select v-model="form.bankId"><option value="">新建当前挑战题库</option><option v-for="bank in banks" :key="bank.id" :value="bank.id">{{ bank.name }}（{{ bank._count?.questions || 0 }} 题）</option></select></label>
        <button class="admin-secondary" type="submit" :disabled="busy">关联题库</button>
      </form>
      <form @submit.prevent="addQuestion">
        <label>单选题题干<input v-model="form.questionStem" required minlength="2" /></label>
        <label>正确选项内容<input v-model="form.questionAnswer" required /></label>
        <button class="admin-secondary" type="submit" :disabled="busy || !form.bankId">新增并发布题目</button>
      </form>
    </template>
  </section>
</template>
