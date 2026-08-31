export function resolveDataMode(value: string | undefined, production = false, mode = ''): 'api' | 'mock' {
  if (value !== undefined && value !== 'api' && value !== 'mock') throw new Error('VITE_DATA_MODE 只允许 api 或 mock')
  if (production && mode !== 'mock' && value !== 'api') throw new Error('正式构建必须显式设置 VITE_DATA_MODE=api；演示请使用 build:mock')
  if (production && mode === 'mock' && value !== 'mock') throw new Error('演示构建必须使用明确的 Mock 配置')
  return value === 'mock' ? 'mock' : 'api'
}
