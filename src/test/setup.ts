import "@testing-library/jest-dom/vitest"

const memory = new Map<string, string>()

const storage: Storage = {
  get length() {
    return memory.size
  },
  clear() {
    memory.clear()
  },
  getItem(key) {
    return memory.get(key) ?? null
  },
  key(index) {
    return [...memory.keys()][index] ?? null
  },
  removeItem(key) {
    memory.delete(key)
  },
  setItem(key, value) {
    memory.set(key, value)
  },
}

Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
})

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {}
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {}
}
