export function safeLoginRedirect(value: unknown) {
  const unsafe = (text: string) => text.includes('\\') || [...text].some((char) => char.charCodeAt(0) < 32)
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || unsafe(value)) return '/community'
  try { const decoded = decodeURIComponent(value); if (decoded.startsWith('//') || unsafe(decoded)) return '/community' } catch { return '/community' }
  return value === '/' ? '/community' : value
}
