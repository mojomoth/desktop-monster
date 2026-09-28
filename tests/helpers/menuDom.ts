import type { MenuDocument, MenuElement } from '../../src/menu/index.js';
import type { PopupKeyEvent } from '../../src/menu/popup.js';
import type { SpriteCanvas } from '../../src/renderer/sprites/sprite.js';
export class MenuNode implements MenuElement {
  className = ''; textContent: string | null = ''; hidden = false; disabled = false; open = false;
  width = 0; height = 0; children: MenuNode[] = []; attributes: Record<string, string> = {};
  onkeydown?: (event: PopupKeyEvent) => void;
  oncancel?: (event: { preventDefault(): void }) => void;
  fills: string[] = [];
  listeners: (() => void)[] = [];
  constructor(readonly tag: string, private readonly doc: MenuDoc) {}
  append(...nodes: unknown[]): void { this.children.push(...nodes as MenuNode[]); }
  replaceChildren(...nodes: unknown[]): void { this.children = nodes as MenuNode[]; }
  addEventListener(_type: string, listener: () => void): void { this.listeners.push(listener); }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  focus(): void { this.doc.activeElement = this; }
  showModal(): void { this.open = true; }
  close(): void { this.open = false; }
  click(): void { for (const listener of this.listeners) listener(); }
  find(cls: string): MenuNode[] { return [...(this.className.split(' ').includes(cls) ? [this] : []), ...this.children.flatMap(node => node.find(cls))]; }
  text(): string { return (this.textContent ?? '') + this.children.map(node => node.text()).join(' '); }
  key(key: string, shiftKey = false): boolean {
    let prevented = false; this.onkeydown?.({ key, shiftKey, preventDefault: () => { prevented = true; } }); return prevented;
  }
  getContext(): SpriteCanvas {
    const context: SpriteCanvas = { fillStyle: '', fillRect: () => { this.fills.push(String(context.fillStyle)); } }; return context;
  }
}
export class MenuDoc implements MenuDocument {
  activeElement: MenuNode | null = null;
  createElement(tag: string): MenuNode { return new MenuNode(tag, this); }
  querySelector(): null { return null; }
}
