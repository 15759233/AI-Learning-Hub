export type LabType = 'agent' | 'deployment' | 'command' | 'hardware' | 'project'

export type LabRunState = 'idle' | 'ready' | 'running' | 'success' | 'failed' | 'stopped' | 'submitted'

export interface LabStep {
  id: string
  title: string
  minutes: number
}

export interface LabTool {
  id: string
  label: string
  mode: 'simulated' | 'read-only'
}

export interface LabScoringRule {
  label: string
  points: number
}

export interface LabDefinition {
  id: string
  type: LabType
  title: string
  subtitle: string
  category: string
  level: string
  duration: number
  coverVariant: string
  steps: LabStep[]
  tools: LabTool[]
  initialProgress: number
  scoring: LabScoringRule[]
  relatedResourceIds: string[]
  task: string
  hints: string[]
  logs: string[]
  result: string
}
