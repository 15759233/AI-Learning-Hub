import { createRenderer, nextTick, ssrContextKey, type Component, type Plugin } from 'vue'
import { createPinia } from 'pinia'

interface Node { type: string; text: string; props: Record<string, unknown>; children: Node[]; parent: Node | null }
const node = (type: string, text = ''): Node => ({ type, text, props: {}, children: [], parent: null })
const remove = (child: Node) => { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null }
const insert = (child: Node, parent: Node, anchor: Node | null = null) => { remove(child); const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, child); child.parent = parent }
const renderer = createRenderer<Node, Node>({
  createElement: (type) => node(type), createText: (text) => node('#text', text), createComment: (text) => node('#comment', text),
  setText: (target, text) => { target.text = text }, setElementText: (target, text) => { target.text = text; target.children = [] },
  parentNode: (target) => target.parent, nextSibling: (target) => target.parent?.children[target.parent.children.indexOf(target) + 1] || null,
  patchProp: (target, key, _previous, value) => { target.props[key] = value }, insert, remove,
  insertStaticContent: (content, parent, anchor) => { const target = node('#static', content); insert(target, parent, anchor); return [target, target] },
})
export const flushRender = async () => { for (let i = 0; i < 8; i++) await nextTick() }
// Node 环境编译为 SSR SFC；挂载真实 setup/watch/动作，DOM 交互另由浏览器验收。
export const setupComponent = <T>(component: Component, props: Record<string, unknown> = {}, plugins: Plugin[] = [createPinia()], provides: Array<[symbol | string, unknown]> = []) => {
  const root = node('root'), app = renderer.createApp({ ...component, render: () => null }, props)
  for (const plugin of plugins) app.use(plugin)
  app.provide(ssrContextKey, {})
  for (const [key, value] of provides) app.provide(key, value)
  const instance = app.mount(root)
  const state = (instance.$ as unknown as { setupState: T }).setupState
  return { state, unmount: () => app.unmount() }
}
