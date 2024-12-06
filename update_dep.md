# 更新 tauri 依赖

文档：

https://v2.tauri.app/develop/updating-dependencies/

```bash
# 更新 tauri 依赖
pnpm update @tauri-apps/cli @tauri-apps/api --latest

# 检查 tauri 依赖
pnpm outdated @tauri-apps/cli
```

## 更新 tauri 版本

https://github.com/killercup/cargo-edit

```bash
cargo install cargo-edit
cd src-tauri
cargo-upgrade upgrade
```

