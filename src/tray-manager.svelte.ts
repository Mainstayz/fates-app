import { emit } from "@tauri-apps/api/event";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon, type TrayIconEvent, type TrayIconOptions } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { _ } from "svelte-i18n";
import { get } from "svelte/store";

class Tray {
    private static instance: Tray | null = null;
    private readonly TRAY_ID = "app-tray";
    private flashState = false;
    private flashFlag = false;
    private showOrHideProgress = true;
    private flashInterval: NodeJS.Timeout | null = null;
    private hasTray = false;

    private constructor() {
        // 私有构造函数，防止外部直接创建实例
    }

    public static getInstance(): Tray {
        if (!Tray.instance) {
            Tray.instance = new Tray();
        }
        return Tray.instance;
    }

    destroy() {
        this.hasTray = false;
        TrayIcon.removeById(this.TRAY_ID);
    }

    public async exit(code: number) {
        await exit(code);
    }

    public async relaunch() {
        await relaunch();
    }

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

    async init() {
        if (!this.hasTray) {
            await this.createTrayIcon();
        }
        this.hasTray = true;
    }

    async getTrayById() {
        const tray = await TrayIcon.getById(this.TRAY_ID);
        return tray;
    }
    async createTrayIcon() {
        let tray = await this.getTrayById();
        if (tray) {
            return tray;
        }
        console.log("createTrayIcon ... ");
        const iconPath = await this.getIconPath();
        console.log("iconPath:", iconPath);
        const options: TrayIconOptions = {
            id: this.TRAY_ID,
            icon: iconPath,
            menu: await this.createMenu(),
            iconAsTemplate: this.isMacos(),
            menuOnLeftClick: false,
            action: async (event: TrayIconEvent) => {
                switch (event.type) {
                    case "Click":
                        console.log(`mouse ${event.button} button pressed, state: ${event.buttonState}`);
                        if (event.button === "Left") {
                            const window = getCurrentWindow();
                            if (window) {
                                await window.unminimize();
                                await window.show();
                                await window.setFocus();
                            } else {
                                console.log("main window not found");
                            }
                        }
                        if (event.button === "Right") {
                            console.log("right button pressed");
                        }
                        break;
                    default:
                        break;
                }
            },
        };
        tray = await TrayIcon.new(options);
        return tray;
    }

    async createMenu() {
        const items = await Promise.all([
            MenuItem.new({
                id: "show_or_hide_progress",
                text: get(_)("app.tray.showOrHideProgress"),
                action: async (id: string) => {
                    this.showOrHideProgress = !this.showOrHideProgress;
                    await emit("toggle-time-progress", this.showOrHideProgress);
                },
            }),
            MenuItem.new({
                id: "exit",
                text: get(_)("app.tray.exit"),
                action: async (id: string) => {
                    console.log("onClick exit(1) ... ");
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

export default Tray.getInstance();
