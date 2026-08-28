const allowedCommands = new Set(['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'grep', 'ps', 'echo'])
const blockedPattern = /[;&|`$><]/

export interface CommandResult {
  ok: boolean
  command: string
  output: string
}

export const runSimulatedCommand = (raw: string): CommandResult => {
  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (!normalized) return { ok: false, command: '', output: '请输入命令后再执行。' }
  if (blockedPattern.test(normalized)) return { ok: false, command: normalized, output: '已拒绝：模拟终端不允许重定向、管道、变量展开或命令串联。' }

  const [command, ...args] = normalized.split(' ')
  if (!allowedCommands.has(command)) {
    return { ok: false, command: normalized, output: `“${command}”不在本实验白名单中。请查看允许命令并缩小操作范围。` }
  }

  const outputs: Record<string, string> = {
    pwd: '/home/student/ai-lab',
    ls: 'README.md  data  notes  src',
    cd: args[0] ? `已切换模拟目录：${args[0]}` : '缺少目录参数。提示：cd 后应跟一个目录名。',
    mkdir: args[0] ? `已创建模拟目录：${args[0]}` : '缺少目录名。',
    touch: args[0] ? `已创建模拟文件：${args[0]}` : '缺少文件名。',
    cat: args[0] ? `模拟读取 ${args[0]}：这是受控学习文件。` : '缺少文件名。',
    cp: args.length === 2 ? `已模拟复制：${args[0]} → ${args[1]}` : '需要源路径和目标路径两个参数。',
    mv: args.length === 2 ? `已模拟移动：${args[0]} → ${args[1]}` : '需要源路径和目标路径两个参数。',
    grep: args.length >= 2 ? `在 ${args.at(-1)} 中找到 2 条包含“${args[0]}”的模拟记录。` : '需要搜索词和文件名。',
    ps: 'PID  COMMAND\n101  learning-agent\n116  lab-monitor',
    echo: args.join(' ') || '提示：echo 后可以跟一段文字。',
  }
  const output = outputs[command]
  const invalid = output.startsWith('缺少') || output.startsWith('需要')
  return { ok: !invalid, command: normalized, output }
}
