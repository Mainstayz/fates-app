// https://github.com/EcoPasteHub/EcoPaste/blob/tauri-v2/src/components/Tray/index.tsx

import { emit } from "@tauri-apps/api/event";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon, type TrayIconOptions } from "@tauri-apps/api/tray";
import { exit } from "@tauri-apps/plugin-process";
import { onMount } from "svelte";


class Tray {
    constructor() {
        this.init();
    }

    async init() {
        const iconPath = await resolveResource("./resources/icon.png");
        console.log("iconPath", iconPath);
    }
}

const tray = new Tray();

export default tray;
