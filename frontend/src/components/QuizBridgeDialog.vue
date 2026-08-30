<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { assessmentApi, type QuizQuestion } from '../services/api/assessments'
import { useAuthStore } from '../stores/auth'
import { useLearningStore } from '../stores/learning'
import AppDialog from './base/AppDialog.vue'
import { useCommunityStore } from '../stores/community'

const auth = useAuthStore()
const learning = useLearningStore()
const open = ref(false)
const slug = ref('')
const questions = ref<QuizQuestion[]>([])
const answers = ref<Record<string, string | boolean | string[]>>({})
const loading = ref(false)
const error = ref('')
const result = ref<{ score: number; correct: number; total: number; passed: boolean } | null>(null)
const share = () => { open.value = false; useCommunityStore().openComposer({ type: 'achievement', title: '一次挑战后的学习心得', contentBlocks: [{ type: 'paragraph', text: '完成这次挑战后，我发现自己还需要复习的知识方向是：' }], bindings: [{ type: 'challenge', id: slug.value }], sourceType: 'challenge', sourceId: slug.value }) }
const setTextAnswer = (questionId: string, event: Event) => {
  answers.value[questionId] = (event.target as HTMLTextAreaElement).value
}
const textAnswer = (questionId: string) => {
  const answer = answers.value[questionId]
  return typeof answer === 'string' ? answer : ''
}

const handleOpen = async (event: Event) => {
  const detail = (event as CustomEvent<{ id: string }>).detail
  if (!auth.user) {
    window.dispatchEvent(new CustomEvent('api-error', { detail: { message: '请先登录统一学习账号再参加测评' } }))
    return
  }
  slug.value = detail.id
  open.value = true
  loading.value = true
  error.value = ''
  result.value = null
  answers.value = {}
  try {
    questions.value = await assessmentApi.questions(detail.id)
    for (const question of questions.value) if (question.questionType === 'multiple') answers.value[question.id] = []
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '题目加载失败' } finally { loading.value = false }
}
const submit = async () => {
  if (questions.value.some((question) => answers.value[question.id] === undefined || answers.value[question.id] === '')) {
    error.value = '请完成全部题目后提交'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await assessmentApi.submit(slug.value, questions.value.map((question) => ({
      questionId: question.id,
      answer: question.questionType === 'code'
        ? { outputs: textAnswer(question.id).split('\n').filter(Boolean) }
        : answers.value[question.id],
    })))
    await learning.syncFromApi()
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '测评提交失败' } finally { loading.value = false }
}
onMounted(() => window.addEventListener('quiz-bridge-open', handleOpen))
onBeforeUnmount(() => window.removeEventListener('quiz-bridge-open', handleOpen))
</script>

<template>
  <AppDialog v-model="open" title="统一挑战测评">
    <div v-if="loading" class="notice">正在连接统一题库…</div>
    <div v-else-if="error" class="answer-wrong" role="alert">{{ error }}</div>
    <div v-else-if="result" class="quiz-result"><strong>{{ result.score }} 分</strong><p>答对 {{ result.correct }} / {{ result.total }} 题，{{ result.passed ? '已达到挑战目标。' : '继续学习后再来挑战。' }}</p><button class="button primary" @click="share">分享学习心得</button><RouterLink class="text-link" :to="`/community/search?bindingId=${slug}`" @click="open = false">查看挑战讨论</RouterLink><p>不公开具体成绩、错题或个人答案。</p></div>
    <form v-else class="dialog-form quiz-form" @submit.prevent="submit">
      <fieldset v-for="(question, index) in questions" :key="question.id">
        <legend>{{ index + 1 }}. {{ question.stem }}</legend>
        <template v-if="question.questionType === 'multiple'">
          <label v-for="option in question.options" :key="option"><input v-model="answers[question.id]" type="checkbox" :value="option.slice(0, 1)" />{{ option }}</label>
        </template>
        <template v-else-if="question.questionType === 'short_answer' || question.questionType === 'code'">
          <textarea :value="textAnswer(question.id)" required rows="5" :placeholder="question.questionType === 'code' ? '输入受控题目的预期输出或答案' : '输入答案'" @input="setTextAnswer(question.id, $event)" />
        </template>
        <template v-else>
          <label v-for="option in question.options" :key="option"><input v-model="answers[question.id]" type="radio" :name="question.id" :value="question.questionType === 'true_false' ? option === '正确' : option.slice(0, 1)" required />{{ option }}</label>
        </template>
      </fieldset>
      <button class="button primary" type="submit" :disabled="questions.length === 0">提交测评</button>
    </form>
  </AppDialog>
</template>
