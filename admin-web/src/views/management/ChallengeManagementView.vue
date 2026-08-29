<script setup lang="ts">
import type { AdminChallengeDetailDto, UpdateChallengeInput } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../../components/AdminKpiCard.vue'
import DomainPageShell from '../../components/DomainPageShell.vue'
import CodeQuestionEditor from '../../components/questions/CodeQuestionEditor.vue'
import MultipleChoiceEditor from '../../components/questions/MultipleChoiceEditor.vue'
import ShortAnswerEditor from '../../components/questions/ShortAnswerEditor.vue'
import SingleChoiceEditor from '../../components/questions/SingleChoiceEditor.vue'
import TrueFalseEditor from '../../components/questions/TrueFalseEditor.vue'
import { useDraftEditor } from '../../composables/useDraftEditor'
import { usePagedList } from '../../composables/usePagedList'
import { usePermissionAction } from '../../composables/usePermissionAction'
import { usePublishAction } from '../../composables/usePublishAction'
import { api } from '../../services/api'

interface Bank { id: string; name: string; _count: { questions: number } }
interface Paper { id: string; name: string; questions?: Array<{ questionId: string; score: number }> }
interface KnowledgePoint { id: string; code: string; name: string }
const list = usePagedList('challenges')
const { result, keyword, status, loading, error, selected } = list
const drafts = useDraftEditor('challenges')
const publishing = usePublishAction('challenges')
const canWrite = usePermissionAction('challenge.write')
const canPublish = usePermissionAction('challenge.publish')
const canQuestion = usePermissionAction('question.write')
const dialog = ref(false)
const detail = ref<AdminChallengeDetailDto | null>(null)
const banks = ref<Bank[]>([])
const papers = ref<Paper[]>([])
const knowledgePoints = ref<KnowledgePoint[]>([])
const questions = ref<Array<{ id: string; stem: string; questionType: string; status: string }>>([])
const fields = reactive({ challengeType: 'weekly', targetScore: 60, rewardPoints: 0, cover: '', startAt: '', endAt: '', leaderboardEnabled: true, questionBankId: '', paperId: '' })
const question = reactive({ questionType: 'single', difficulty: '基础', knowledgePointId: '', stem: '', analysis: '' })
const answerConfig = ref<Record<string, unknown>>({})
const questionEditors = {
  single: SingleChoiceEditor,
  multiple: MultipleChoiceEditor,
  true_false: TrueFalseEditor,
  short_answer: ShortAnswerEditor,
  code: CodeQuestionEditor,
}
const activeQuestionEditor = computed(() => questionEditors[question.questionType as keyof typeof questionEditors])
const paperForm = reactive({ name: '', durationMinutes: 30, totalScore: 100, passScore: 60 })
const selectedPaperId = ref('')
const paperScores = reactive<Record<string, number>>({})
watch(list.selected, async (item) => {
  if (!item) return
  const loaded = await api<AdminChallengeDetailDto>(`/admin/challenges/${item.databaseId}`)
  detail.value = loaded
  Object.assign(fields, {
    challengeType: loaded.challengeType,
    targetScore: loaded.targetScore,
    rewardPoints: loaded.rewardPoints,
    cover: String(item.data.cover || ''),
    startAt: String(item.data.startAt || '').slice(0, 16),
    endAt: String(item.data.endAt || '').slice(0, 16),
    leaderboardEnabled: Boolean(item.data.leaderboardEnabled ?? true),
    questionBankId: loaded.questionBankId || '',
    paperId: loaded.paperId || '',
  })
})
const loadReferences = async () => {
  if (!canQuestion.value) return
  ;[banks.value, papers.value, knowledgePoints.value] = await Promise.all([
    api<Bank[]>('/admin/question-banks'),
    api<Paper[]>('/admin/papers'),
    api<KnowledgePoint[]>('/admin/knowledge-points'),
  ])
  question.knowledgePointId ||= knowledgePoints.value[0]?.id || ''
}
onMounted(async () => { await Promise.all([list.load(1), loadReferences()]) })
watch(() => fields.questionBankId, async (bankId) => { questions.value = bankId ? await api(`/admin/questions?bankId=${encodeURIComponent(bankId)}`) : [] })
const input = (): UpdateChallengeInput => ({ ...fields, startAt: fields.startAt ? new Date(fields.startAt).toISOString() : undefined, endAt: fields.endAt ? new Date(fields.endAt).toISOString() : undefined })
const create = async (value: { slug: string; title: string; summary: string }) => { await drafts.createDraft({ ...value, challengeType: 'weekly', targetScore: 60, rewardPoints: 0 }); dialog.value = false; await list.load(1); ElMessage.success('挑战草稿已创建') }
const save = async (base: { title: string; summary: string; sortOrder: number }) => {
  if (!list.selected.value) return
  await drafts.saveDraft(list.selected.value, { ...base, ...input() })
  if (fields.questionBankId) await api(`/admin/challenges/${list.selected.value.databaseId}/question-bank`, { method: 'PUT', body: JSON.stringify({ questionBankId: fields.questionBankId }) })
  if (fields.paperId) await api(`/admin/challenges/${list.selected.value.databaseId}/paper`, { method: 'PUT', body: JSON.stringify({ paperId: fields.paperId }) })
  await list.load(); ElMessage.success('挑战规则与题库/试卷关联已保存')
}
const createBank = async () => {
  const bank = await api<Bank>('/admin/question-banks', { method: 'POST', body: JSON.stringify({ name: `${list.selected.value?.title || '挑战'}题库` }) })
  await loadReferences(); fields.questionBankId = bank.id; ElMessage.success('题库草稿已创建')
}
const parsedAnswer = () => {
  if (question.questionType === 'multiple') return String(answerConfig.value.answers || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (question.questionType === 'true_false') return Boolean(answerConfig.value.answer)
  if (question.questionType === 'short_answer') return { keywords: String(answerConfig.value.keywords || '').split(',').map((item) => item.trim()).filter(Boolean), mode: answerConfig.value.mode || 'all' }
  if (question.questionType === 'code') return { expectedOutputs: String(answerConfig.value.expectedOutputs || '').split('\n').filter(Boolean) }
  return String(answerConfig.value.answer || '')
}
const addQuestion = async () => {
  if (!fields.questionBankId || !question.knowledgePointId) return
  const options = ['single', 'multiple'].includes(question.questionType)
    ? String(answerConfig.value.options || '').split('\n').filter(Boolean).map((text) => ({ key: text.slice(0, 1), text: text.replace(/^[A-Z][.、]\s*/, '') }))
    : question.questionType === 'true_false'
      ? [{ key: 'true', text: '正确' }, { key: 'false', text: '错误' }]
      : question.questionType === 'code'
        ? [{ language: answerConfig.value.language, starterCode: answerConfig.value.starterCode }]
        : []
  await api('/admin/questions', { method: 'POST', body: JSON.stringify({ ...question, bankId: fields.questionBankId, options, standardAnswer: parsedAnswer() }) })
  questions.value = await api(`/admin/questions?bankId=${encodeURIComponent(fields.questionBankId)}`)
  Object.assign(question, { stem: '', analysis: '' })
  answerConfig.value = {}
  ElMessage.success('题目已创建为草稿，未自动发布')
}
const createPaper = async () => {
  const created = await api<Paper>('/admin/papers', { method: 'POST', body: JSON.stringify(paperForm) })
  await loadReferences()
  selectedPaperId.value = created.id
  fields.paperId = created.id
  Object.assign(paperForm, { name: '', durationMinutes: 30, totalScore: 100, passScore: 60 })
  ElMessage.success('试卷草稿已创建')
}
const savePaperQuestions = async () => {
  if (!selectedPaperId.value) return
  const items = questions.value
    .filter((item) => Number(paperScores[item.id]) > 0)
    .map((item, sortOrder) => ({ questionId: item.id, sortOrder, score: Number(paperScores[item.id]) }))
  await api(`/admin/papers/${selectedPaperId.value}/questions`, { method: 'PUT', body: JSON.stringify({ items }) })
  fields.paperId = selectedPaperId.value
  await loadReferences()
  ElMessage.success('试卷题目与分值已保存并发布')
}
const publish = async () => { if (list.selected.value) { await publishing.publish(list.selected.value); await list.load(); ElMessage.success('挑战已发布') } }
const archive = async () => { if (list.selected.value) { await publishing.archive(list.selected.value); await list.load(); ElMessage.success('挑战已下架') } }
</script>

<template>
  <DomainPageShell v-model:dialog="dialog" title="挑战测评管理" description="管理挑战、题库、试卷、知识点与题型草稿" noun="挑战" icon="challenge" :result="result" :selected="selected" :keyword="keyword" :status="status" :loading="loading" :error="error" :can-write="canWrite" :can-publish="canPublish" @update:keyword="list.keyword.value = $event" @update:status="list.status.value = $event" @select="list.select" @page="list.load" @retry="list.load()" @create="create" @save="save" @publish="publish" @archive="archive">
    <template #kpis><div class="kpi-grid"><AdminKpiCard icon="challenge" label="挑战总数" :value="result.total" color="#ff4d1f" /><AdminKpiCard icon="theme" label="题库" :value="banks.length" color="#3478f6" /><AdminKpiCard icon="course" label="当前题目" :value="questions.length" color="#7c4dff" /><AdminKpiCard icon="check" label="已发布挑战" :value="result.items.filter((item) => item.status === 'published').length" color="#22b66c" /></div></template>
    <template #detail><p>目标 {{ detail?.targetScore ?? '—' }} 分 · 奖励 {{ detail?.rewardPoints ?? '—' }} 积分 · {{ detail?.rules.length || 0 }} 条服务端规则</p></template>
    <template #editor>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <section class="domain-section"><h3>挑战基础信息</h3><label>挑战类型<input v-model="fields.challengeType" /></label><label>封面<input v-model="fields.cover" /></label><label>开始时间<input v-model="fields.startAt" type="datetime-local" /></label><label>结束时间<input v-model="fields.endAt" type="datetime-local" /></label><label>目标分数<input v-model.number="fields.targetScore" type="number" min="0" max="100" /></label><label>奖励积分<input v-model.number="fields.rewardPoints" type="number" min="0" /></label><label class="toggle-row">排行榜<el-switch v-model="fields.leaderboardEnabled" /></label><label>关联题库<select v-model="fields.questionBankId"><option value="">未关联</option><option v-for="bank in banks" :key="bank.id" :value="bank.id">{{ bank.name }}（{{ bank._count.questions }} 题）</option></select></label><button class="admin-secondary" type="button" :disabled="!canQuestion" @click="createBank">新建题库草稿</button><label>关联试卷<select v-model="fields.paperId"><option value="">未关联</option><option v-for="paper in papers" :key="paper.id" :value="paper.id">{{ paper.name }}</option></select></label></section>
      </fieldset>
      <fieldset class="domain-permission-scope" :disabled="!canQuestion">
      <section class="domain-section"><h3>题目编辑（新题默认草稿）</h3><label>题型<select v-model="question.questionType"><option v-for="type in ['single','multiple','true_false','short_answer','code']" :key="type">{{ type }}</option></select></label><label>知识点<select v-model="question.knowledgePointId"><option v-for="point in knowledgePoints" :key="point.id" :value="point.id">{{ point.code }} · {{ point.name }}</option></select></label><label>难度<input v-model="question.difficulty" /></label><label>题干<textarea v-model="question.stem" rows="3" /></label><component :is="activeQuestionEditor" v-model="answerConfig" /><label>解析<textarea v-model="question.analysis" rows="3" /></label><button class="admin-secondary" type="button" :disabled="!canQuestion || !fields.questionBankId" @click="addQuestion">保存题目草稿</button><ul><li v-for="item in questions" :key="item.id">{{ item.questionType }} · {{ item.stem }} · {{ item.status }}</li></ul></section>
      <section class="domain-section"><h3>试卷组卷</h3><label>试卷名称<input v-model="paperForm.name" /></label><label>时长（分钟）<input v-model.number="paperForm.durationMinutes" type="number" min="1" /></label><label>总分<input v-model.number="paperForm.totalScore" type="number" min="1" /></label><label>及格分<input v-model.number="paperForm.passScore" type="number" min="1" /></label><button class="admin-secondary" type="button" :disabled="!canQuestion || !paperForm.name" @click="createPaper">创建试卷草稿</button><label>当前试卷<select v-model="selectedPaperId"><option value="">请选择</option><option v-for="paper in papers" :key="paper.id" :value="paper.id">{{ paper.name }}</option></select></label><div v-for="item in questions" :key="item.id" class="stage-editor"><span>{{ item.stem }}</span><label>分值（0 表示不选）<input v-model.number="paperScores[item.id]" type="number" min="0" /></label></div><button class="admin-primary" type="button" :disabled="!canQuestion || !selectedPaperId" @click="savePaperQuestions">保存组卷并发布</button></section>
      </fieldset>
    </template>
  </DomainPageShell>
</template>
