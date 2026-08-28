import type { LabRunState } from './types'

const transitions: Record<LabRunState, LabRunState[]> = {
  idle: ['ready'],
  ready: ['running'],
  running: ['success', 'failed', 'stopped'],
  success: ['running', 'submitted', 'ready'],
  failed: ['running', 'ready'],
  stopped: ['running', 'ready'],
  submitted: ['running', 'ready'],
}

export const canTransition = (from: LabRunState, to: LabRunState) => transitions[from].includes(to)

export const progressForState = (state: LabRunState, initial: number) => {
  if (state === 'submitted') return 100
  if (state === 'success') return Math.max(88, initial)
  if (state === 'running') return Math.max(68, initial)
  return initial
}
