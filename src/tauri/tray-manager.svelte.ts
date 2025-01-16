import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { _ } from "svelte-i18n";
import { get } from "svelte/store";
import { NOTIFICATION_TOGGLE_MAIN_WINDOW, NOTIFICATION_TOGGLE_TIME_PROGRESS } from "$src/config";


class Tray {
    private static instance: Tray | null = null;
    private readonly TRAY_ID = "app-tray";
    private flashState = false;
    private flashFlag = false;
    private showOrHideProgress = true;
    private flashInterval: NodeJS.Timeout | null = null;
    private hasTray = false;
    private unlisten: UnlistenFn | null = null;

    private constructor() {}

    public static getInstance(): Tray {
        if (!Tray.instance) {
            Tray.instance = new Tray();
        }
        return Tray.instance;
    }

    public async init() {
        if (!this.hasTray) {
             // add event listener
            if (this.unlisten) {
                console.log("[TrayManager] Destroy unlisten ...");
                this.unlisten();
            }
            this.unlisten = await listen(NOTIFICATION_TOGGLE_MAIN_WINDOW, (event) => {
                console.log("[TrayManager] On receive NOTIFICATION_TOGGLE_MAIN_WINDOW ... ", event.payload);
                if (event.payload === true) {
                    this.showMainWindow();
                } else {
                    this.hideMainWindow();
                }
            });
            await this.setupTrayIcon();
        }
        this.hasTray = true;
    }

     public destroy() {
        this.hasTray = false;
        if (this.unlisten) {
            console.log("[TrayManager] Destroy unlisten ...");
            this.unlisten();
        }
    }

    public async showMainWindow() {
        const win = getCurrentWindow();
        if (win) {
            await win.unminimize();
            await win.show();
            await win.setFocus();
        }
    }
    public async hideMainWindow() {
        const win = getCurrentWindow();
        if (win) {
            await win.hide();
        }
    }

    public async exit(code: number) {
        await exit(code);
    }

    public async relaunch() {
        await relaunch();
    }

    // not used
    public async flash(state: boolean) {
        if (this.flashState === state) {
            return;
        }
        let tray = await this.getTrayById();
        if (!tray) {
            return;
        }
        this.flashState = state;
        if (this.isWindows()) {
            const iconPath = await this.getIconPath();
            if (state) {
                this.flashFlag = true;
                this.flashInterval = setInterval(() => {
                    if (this.flashFlag) {
                        tray.setIcon(null);
                    } else {
                        tray.setIcon(iconPath);
                    }
                    this.flashFlag = !this.flashFlag;
                }, 500);
            } else {
                if (this.flashInterval) {
                    clearInterval(this.flashInterval);
                }
                tray.setIcon(iconPath);
                this.flashInterval = null;
            }
        }
    }

    isMacos() {
        return platform().toLowerCase() === "macos";
    }

    isWindows() {
        return platform().toLowerCase() === "windows";
    }

    getIconPath() {
        if (this.isWindows()) {
            return resolveResource("./resources/icon.ico");
        } else if (this.isMacos()) {
            return resolveResource("./resources/icon-mac.ico");
        } else {
            return resolveResource("./resources/icon.png");
        }
    }

    async getTrayById() {
        return await TrayIcon.getById(this.TRAY_ID);
    }
    async setupTrayIcon() {
        let tray = await this.getTrayById();
        if (!tray) {
            console.error("[TrayManager] GetTrayById not found!!");
            return;
        }
        console.log("[TrayManager] Will reset tray properties ... ");
        await tray.setTooltip("Tauri");
        // const iconPath = await this.getIconPath();
        // console.log("[TrayManager] IconPath:", iconPath);
        // await tray.setIcon(iconPath);
        // await tray.setIconAsTemplate(this.isMacos());
        // await tray.setMenuOnLeftClick(false);
        let menu = await this.createMenu();
        await tray.setMenu(menu);
        return tray;
    }

    async createMenu() {
        const items = await Promise.all([
            MenuItem.new({
                id: "show_or_hide_progress",
                text: get(_)("app.tray.showOrHideProgress"),
                action: async (id: string) => {
                    this.showOrHideProgress = !this.showOrHideProgress;
                    console.log("[TrayManager] Emit NOTIFICATION_TOGGLE_TIME_PROGRESS ... ", this.showOrHideProgress);
                    await emit(NOTIFICATION_TOGGLE_TIME_PROGRESS, this.showOrHideProgress);
                },
            }),
            MenuItem.new({
                id: "exit",
                text: get(_)("app.tray.exit"),
                action: async (id: string) => {
                    console.log("[TrayManager] onClick exit(1) ... ");
                    await exit(1);
                },
            }),
        ]);
        return Menu.new({ items });
    }
    async updateMenu() {
        let tray = await this.getTrayById();
        if (!tray) {
            return;
        }
        tray.setMenu(await this.createMenu());

    }
}

export const trayManager = Tray.getInstance();

export default trayManager;
