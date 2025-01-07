import json
import os
import sys
from pathlib import Path


def update_version(new_version=None):
    # 获取当前脚本所在目录
    script_dir = Path(__file__).parent

    # 读取 package.json
    pkg_path = script_dir.parent / "package.json"
    with open(pkg_path, "r", encoding="utf-8") as f:
        pkg = json.load(f)

    # 读取 tauri.conf.json
    tauri_path = script_dir.parent / "src-tauri" / "tauri.conf.json"
    with open(tauri_path, "r", encoding="utf-8") as f:
        tauri_conf = json.load(f)

    # 获取当前版本
    current_version = pkg["version"]

    # 计算新版本
    if new_version:
        next_version = new_version
    else:
        major, minor, patch = map(int, current_version.split("."))
        next_version = f"{major}.{minor}.{patch + 1}"

    # 更新 package.json
    pkg["version"] = next_version
    with open(pkg_path, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2)

    # 更新 tauri.conf.json
    tauri_conf["version"] = next_version
    with open(tauri_path, "w", encoding="utf-8") as f:
        json.dump(tauri_conf, f, indent=2)

    print(f"版本号已更新为：{next_version}")


if __name__ == "__main__":
    new_version = sys.argv[1] if len(sys.argv) > 1 else None
    update_version(new_version)
