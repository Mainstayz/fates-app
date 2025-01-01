# update tauri dependencies

document:

https://v2.tauri.app/develop/updating-dependencies/

```bash
# update tauri dependencies
pnpm update @tauri-apps/cli @tauri-apps/api --latest

# check tauri dependencies
pnpm outdated @tauri-apps/cli
```

## update tauri version

https://github.com/killercup/cargo-edit

```bash
cargo install cargo-edit
cd src-tauri
cargo-upgrade upgrade
```

