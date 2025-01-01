# Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Install

```bash

pnpm install

pnpm tauri dev

```

### add shadcn

1. add tailwindcss support
2. initialize shadcn component library
3. install shadcn component library

```bash

npx sv add tailwindcss
npx shadcn-svelte@next init
npx shadcn-svelte@next add button

# regenerate component library

```bash
npx shadcn-svelte@next add alert-dialog button calendar card dialog dropdown-menu form input label popover resizable select separator tabs tooltip
```

### system tray tutorial

[system tray tutorial](https://v2.tauri.app/zh-cn/learn/system-tray/)

