const units = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000 }

export const durationMs = (value: string | undefined, fallback: string) => {
  const match = /^(\d+)([dhms])$/.exec(value || fallback)
  if (!match) throw new Error(`无效的时效配置：${value || fallback}`)
  return Number(match[1]) * units[match[2] as keyof typeof units]
}
