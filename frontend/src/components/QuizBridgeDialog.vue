<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { assessmentApi, type QuizQuestion } from '../services/api/assessments'
import { useAuthStore } from '../stores/auth'
import AppDialog from './base/AppDialog.vue'

const auth = useAuthStore()
const open = ref(false)
const slug = ref('')
const questions = ref<QuizQuestion[]>([])
const answers = ref<Record<string, unknown>>({})
const loading = ref(false)
const error = ref('')
const result = ref<{ score: number; correct: number; total: number; passed: boolean } | null>(null)

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
  try { questions.value = await assessmentApi.questions(detail.id) } catch (reason) { error.value = reason instanceof Error ? reason.message : '题目加载失败' } finally { loading.value = false }
}
const submit = async () => {
  loading.value = true
  error.value = ''
  try {
    result.value = await assessmentApi.submit(slug.value, questions.value.map((question) => ({ questionId: question.id, answer: answers.value[question.id] })))
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '测评提交失败' } finally { loading.value = false }
}
onMounted(() => window.addEventListener('quiz-bridge-open', handleOpen))
onBeforeUnmount(() => window.removeEventListener('quiz-bridge-open', handleOpen))
</script>

<template>
  <AppDialog v-model="open" title="统一挑战测评">
    <div v-if="loading" class="notice">正在连接统一题库…</div>
    <div v-else-if="error" class="answer-wrong" role="alert">{{ error }}</div>
    <div v-else-if="result" class="quiz-result"><strong>{{ result.score }} 分</strong><p>答对 {{ result.correct }} / {{ result.total }} 题，{{ result.passed ? '已达到挑战目标。' : '继续学习后再来挑战。' }}</p></div>
    <form v-else class="dialog-form quiz-form" @submit.prevent="submit">
      <fieldset v-for="(question, index) in questions" :key="question.id">
        <legend>{{ index + 1 }}. {{ question.stem }}</legend>
        <label v-for="option in question.options" :key="option"><input v-model="answers[question.id]" type="radio" :name="question.id" :value="question.questionType === 'true_false' ? option === '正确' : option.slice(0, 1)" required />{{ option }}</label>
      </fieldset>
      <button class="button primary" type="submit" :disabled="questions.length === 0">提交测评</button>
    </form>
  </AppDialog>
</template>
