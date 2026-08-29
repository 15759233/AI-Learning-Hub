<script setup lang="ts">
import type { AdminCourseDetailDto } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../../components/AdminKpiCard.vue'
import AdminDialog from '../../components/AdminDialog.vue'
import DomainPageShell from '../../components/DomainPageShell.vue'
import { useDraftEditor } from '../../composables/useDraftEditor'
import { usePagedList } from '../../composables/usePagedList'
import { usePermissionAction } from '../../composables/usePermissionAction'
import { usePublishAction } from '../../composables/usePublishAction'
import { api } from '../../services/api'

const list = usePagedList('courses')
const { result, keyword, status, loading, error, selected } = list
const drafts = useDraftEditor('courses')
const publishing = usePublishAction('courses')
const canWrite = usePermissionAction('course.write')
const canPublish = usePermissionAction('course.publish')
const dialog = ref(false)
const detail = ref<AdminCourseDetailDto | null>(null)
const previewOpen = ref(false)
const resourceOptions = ref<Array<{ databaseId: string; title: string }>>([])
const labOptions = ref<Array<{ databaseId: string; title: string }>>([])
const relationIds = reactive({ resources: [] as string[], labs: [] as string[] })
const fields = reactive({ category: '', level: '', mode: '', hours: 0, cover: '', instructorName: '', instructorTitle: '', certificate: '' })
const content = reactive({ chapterTitle: '', lessonTitle: '', blockType: 'paragraph', blockText: '' })
watch(list.selected, async (item) => {
  if (!item) return
  detail.value = await api<AdminCourseDetailDto>(`/admin/courses/${item.databaseId}`)
  Object.assign(fields, {
    category: String(item.data.category || ''),
    level: String(item.data.level || ''),
    mode: String(item.data.mode || ''),
    hours: Number(item.data.hours || 0),
    cover: String(item.data.cover || ''),
    instructorName: String((item.data.instructor as Record<string, unknown> | undefined)?.name || ''),
    instructorTitle: String((item.data.instructor as Record<string, unknown> | undefined)?.title || ''),
    certificate: String(item.data.certificate || ''),
  })
  relationIds.resources = detail.value.relatedResources.map((entry) => entry.id).filter((id): id is string => Boolean(id))
  relationIds.labs = detail.value.relatedLabs.map((entry) => entry.id).filter((id): id is string => Boolean(id))
})
onMounted(async () => {
  await list.load(1)
  const [resources, labs] = await Promise.all([
    api<{ items: Array<{ databaseId: string; title: string }> }>('/admin/resources?page=1&pageSize=50'),
    api<{ items: Array<{ databaseId: string; title: string }> }>('/admin/labs?page=1&pageSize=50'),
  ])
  resourceOptions.value = resources.items
  labOptions.value = labs.items
})
const create = async (value: { slug: string; title: string; summary: string }) => { await drafts.createDraft(value); dialog.value = false; await list.load(1); ElMessage.success('课程草稿已创建') }
const save = async (base: { title: string; summary: string; sortOrder: number }) => {
  if (!list.selected.value) return
  await drafts.saveDraft(list.selected.value, { ...base, ...fields })
  await list.load(); ElMessage.success('课程基础信息已保存')
}
const addContent = async () => {
  if (!list.selected.value || !content.chapterTitle || !content.lessonTitle || !content.blockText) return
  const chapter = await api<{ id: string }>(`/admin/courses/${list.selected.value.databaseId}/chapters`, { method: 'POST', body: JSON.stringify({ title: content.chapterTitle, description: '', sortOrder: detail.value?.chapters.length || 0 }) })
  const lesson = await api<{ id: string }>(`/admin/chapters/${chapter.id}/lessons`, { method: 'POST', body: JSON.stringify({ title: content.lessonTitle, summary: content.blockText.slice(0, 120), lessonType: 'article', durationMinutes: 10, sortOrder: 0 }) })
  const value = content.blockType === 'key_points' ? { items: content.blockText.split('\n').filter(Boolean) } : content.blockType === 'code' ? { language: 'text', code: content.blockText } : { text: content.blockText }
  await api(`/admin/lessons/${lesson.id}/blocks`, { method: 'POST', body: JSON.stringify({ blockType: content.blockType, sortOrder: 0, content: value }) })
  detail.value = await api<AdminCourseDetailDto>(`/admin/courses/${list.selected.value.databaseId}`)
  Object.assign(content, { chapterTitle: '', lessonTitle: '', blockText: '' })
  ElMessage.success('章节、课时与内容块已写入当前草稿')
}
const refreshDetail = async () => {
  if (list.selected.value) detail.value = await api<AdminCourseDetailDto>(`/admin/courses/${list.selected.value.databaseId}`)
}
const reorder = async (path: string, items: Array<{ id: string }>, index: number, offset: number) => {
  const next = index + offset
  if (next < 0 || next >= items.length) return
  const ordered = [...items]
  ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
  await api(path, { method: 'PUT', body: JSON.stringify({ items: ordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }) })
  await refreshDetail()
}
const updateChapter = async (chapter: { id: string; title: string; description: string }) => {
  await api(`/admin/course-chapters/${chapter.id}`, { method: 'PATCH', body: JSON.stringify({ title: chapter.title, description: chapter.description }) })
  ElMessage.success('章节已更新')
}
const removeChapter = async (id: string) => {
  await api(`/admin/course-chapters/${id}`, { method: 'DELETE' })
  await refreshDetail()
}
const updateLesson = async (lesson: { id: string; title: string; summary: string; lessonType: string; durationMinutes: number }) => {
  await api(`/admin/course-lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ title: lesson.title, summary: lesson.summary, lessonType: lesson.lessonType, durationMinutes: lesson.durationMinutes }) })
  ElMessage.success('课时已更新')
}
const removeLesson = async (id: string) => {
  await api(`/admin/course-lessons/${id}`, { method: 'DELETE' })
  await refreshDetail()
}
const removeBlock = async (id: string) => {
  await api(`/admin/lesson-blocks/${id}`, { method: 'DELETE' })
  await refreshDetail()
}
const saveRelations = async () => {
  if (!list.selected.value) return
  detail.value = await api(`/admin/courses/${list.selected.value.databaseId}/relations`, {
    method: 'PUT',
    body: JSON.stringify({ resourceIds: relationIds.resources, labIds: relationIds.labs }),
  })
  ElMessage.success('课程关联内容已保存')
}
const publish = async () => { if (list.selected.value) { await publishing.publish(list.selected.value); await list.load(); ElMessage.success('课程版本已发布') } }
const archive = async () => { if (list.selected.value) { await publishing.archive(list.selected.value); await list.load(); ElMessage.success('课程已下架') } }
</script>

<template>
  <DomainPageShell v-model:dialog="dialog" title="课程内容管理" description="维护课程信息、章节、课时与结构化内容块" noun="课程" icon="course" :result="result" :selected="selected" :keyword="keyword" :status="status" :loading="loading" :error="error" :can-write="canWrite" :can-publish="canPublish" @update:keyword="list.keyword.value = $event" @update:status="list.status.value = $event" @select="list.select" @page="list.load" @retry="list.load()" @create="create" @save="save" @publish="publish" @archive="archive">
    <template #kpis><div class="kpi-grid"><AdminKpiCard icon="course" label="课程总数" :value="result.total" color="#ff4d1f" /><AdminKpiCard icon="check" label="已发布" :value="result.items.filter((item) => item.status === 'published').length" color="#22b66c" /><AdminKpiCard icon="theme" label="当前章节" :value="detail?.chapters.length || 0" color="#7c4dff" /><AdminKpiCard icon="clock" label="当前课时" :value="detail?.chapters.reduce((sum, item) => sum + item.lessons.length, 0) || 0" color="#3478f6" /></div></template>
    <template #detail><p>草稿章节 {{ detail?.chapters.length || 0 }} 个，发布操作会固化当前版本快照。</p></template>
    <template #editor>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <section class="domain-section"><h3>课程基础信息</h3><label>主题与分类<input v-model="fields.category" /></label><label>难度<select v-model="fields.level"><option value="">尚未配置</option><option>入门</option><option>初级</option><option>中级</option><option>高级</option></select></label><label>学习方式<select v-model="fields.mode"><option value="">尚未配置</option><option>视频</option><option>图文</option><option>实战项目</option><option>互动实验</option></select></label><label>预计时长（小时）<input v-model.number="fields.hours" type="number" min="0" step=".5" /></label><label>封面资源<input v-model="fields.cover" /></label><label>讲师姓名<input v-model="fields.instructorName" /></label><label>讲师说明<input v-model="fields.instructorTitle" /></label><label>证书名称<input v-model="fields.certificate" /></label></section>
      <section class="domain-section"><h3>新增结构化课程内容</h3><label>章节标题<input v-model="content.chapterTitle" /></label><label>课时标题<input v-model="content.lessonTitle" /></label><label>内容块类型<select v-model="content.blockType"><option v-for="type in ['heading','paragraph','image','video','code','diagram','key_points','quiz','resource','lab','note_entry','next_lesson']" :key="type">{{ type }}</option></select></label><label>内容<textarea v-model="content.blockText" rows="4" /></label><button class="admin-secondary" type="button" :disabled="!canWrite" @click="addContent">加入当前草稿</button><ul><li v-for="chapter in detail?.chapters || []" :key="chapter.id">{{ chapter.title }}：{{ chapter.lessons.length }} 课时</li></ul></section>
      <section class="domain-section"><h3>课程结构编辑 <button class="text-link" type="button" @click="previewOpen = true">预览草稿</button></h3><div v-for="(chapter, chapterIndex) in detail?.chapters || []" :key="chapter.id" class="stage-editor"><label>章节标题<input v-model="chapter.title" /></label><label>章节说明<input v-model="chapter.description" /></label><div><button class="text-link" type="button" :disabled="chapterIndex === 0" @click="reorder(`/admin/courses/${selected?.databaseId}/chapters/reorder`, detail?.chapters || [], chapterIndex, -1)">上移</button><button class="text-link" type="button" :disabled="chapterIndex === (detail?.chapters.length || 0) - 1" @click="reorder(`/admin/courses/${selected?.databaseId}/chapters/reorder`, detail?.chapters || [], chapterIndex, 1)">下移</button><button class="text-link" type="button" @click="updateChapter(chapter)">保存章节</button><button class="admin-danger" type="button" @click="removeChapter(chapter.id)">删除章节</button></div><article v-for="(lesson, lessonIndex) in chapter.lessons" :key="lesson.id"><label>课时标题<input v-model="lesson.title" /></label><label>课时摘要<input v-model="lesson.summary" /></label><label>类型<input v-model="lesson.lessonType" /></label><label>分钟<input v-model.number="lesson.durationMinutes" type="number" min="1" /></label><button class="text-link" type="button" @click="updateLesson(lesson)">保存课时</button><button class="text-link" type="button" :disabled="lessonIndex === 0" @click="reorder(`/admin/chapters/${chapter.id}/lessons/reorder`, chapter.lessons, lessonIndex, -1)">上移</button><button class="text-link" type="button" :disabled="lessonIndex === chapter.lessons.length - 1" @click="reorder(`/admin/chapters/${chapter.id}/lessons/reorder`, chapter.lessons, lessonIndex, 1)">下移</button><button class="admin-danger" type="button" @click="removeLesson(lesson.id)">删除课时</button><ul><li v-for="block in lesson.blocks" :key="block.id">{{ block.blockType }} · {{ String(block.content.text || block.content.code || '结构化内容') }} <button class="text-link" type="button" @click="removeBlock(block.id)">删除</button></li></ul></article></div></section>
      <section class="domain-section"><h3>关联资源与实训</h3><label>关联资源<select v-model="relationIds.resources" multiple><option v-for="item in resourceOptions" :key="item.databaseId" :value="item.databaseId">{{ item.title }}</option></select></label><label>关联实训<select v-model="relationIds.labs" multiple><option v-for="item in labOptions" :key="item.databaseId" :value="item.databaseId">{{ item.title }}</option></select></label><button class="admin-secondary" type="button" @click="saveRelations">保存关联</button></section>
      </fieldset>
    </template>
  </DomainPageShell>
  <AdminDialog v-model="previewOpen" title="课程草稿预览"><article v-for="chapter in detail?.chapters || []" :key="chapter.id"><h3>{{ chapter.title }}</h3><p>{{ chapter.description }}</p><section v-for="lesson in chapter.lessons" :key="lesson.id"><h4>{{ lesson.title }} · {{ lesson.durationMinutes }} 分钟</h4><p>{{ lesson.summary }}</p><div v-for="block in lesson.blocks" :key="block.id">{{ block.blockType }}：{{ block.content.text || block.content.code || JSON.stringify(block.content) }}</div></section></article><p v-if="!detail?.chapters.length">当前草稿尚无课程结构。</p></AdminDialog>
</template>
