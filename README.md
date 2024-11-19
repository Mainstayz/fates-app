# Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Install

```bash

pnpm install

pnpm tauri dev

```

### 添加 shadcn 组件库

1. 添加 tailwindcss 支持
2. 初始化 shadcn 组件库
3. 安装 shadcn 组件库

```bash

npx sv add tailwindcss
npx shadcn-svelte@next init
npx shadcn-svelte@next add button

# 重新生成组件库

```bash
npx shadcn-svelte@next add alert-dialog button calendar card dialog dropdown-menu form input label popover select separator tabs
```

### 系统托盘教程

[系统托盘教程](https://v2.tauri.app/zh-cn/learn/system-tray/)

