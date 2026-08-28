export interface QuizBridge {
  startChallenge(id: string): void
  startAssessment(id: string): void
  startPractice(id: string): void
  openWrongQuestions(): void
  openReport(id?: string): void
}

type QuizAction = '挑战' | '测评' | '练习' | '错题' | '报告'

const notify = (action: QuizAction, id?: string) => {
  window.dispatchEvent(new CustomEvent('quiz-bridge', {
    detail: { action, id, message: `演示模式：已通过统一适配层打开《题盒》${action}入口，待真实路由或接口接入。` },
  }))
}

export const quizBridge: QuizBridge = {
  startChallenge: (id) => notify('挑战', id),
  startAssessment: (id) => notify('测评', id),
  startPractice: (id) => notify('练习', id),
  openWrongQuestions: () => notify('错题'),
  openReport: (id) => notify('报告', id),
}
