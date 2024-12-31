// https://github.com/EcoPasteHub/EcoPaste/blob/tauri-v2/src/components/Tray/index.tsx

import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon, type TrayIconEvent, type TrayIconOptions } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { exit, relaunch } from "@tauri-apps/plugin-process";

let hasTray = false;

class Tray {
    private TRAY_ID = "app-tray";
    private flashState = false;
    private flashFlag = false;
    private flashInterval: NodeJS.Timeout | null = null;
    constructor() {
        this.init();
    }
    destroy() {
        hasTray = false;
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
            const iconPath = await resolveResource("./resources/icon.png");
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

    async init() {
        if (!hasTray) {
            await this.createTrayIcon();
        }
        hasTray = true;
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
        const iconPath = await resolveResource("./resources/icon.png");
        console.log("iconPath:", iconPath);
        const options: TrayIconOptions = {
            id: this.TRAY_ID,
            icon: iconPath,
            menu: await this.createMenu(),
            menuOnLeftClick: this.isMacos(),
            action: async (event: TrayIconEvent) => {
                switch (event.type) {
                    case "Click":
                        console.log(`mouse ${event.button} button pressed, state: ${event.buttonState}`);
                        if (event.button === "Left") {
                            // 左键点击，显示主窗口
                            if (this.isMacos()) {
                                return;
                            }
                            const window = getCurrentWindow();
                            if (window) {
                                await window.unminimize();
                                await window.show();
                                await window.setFocus();
                            } else {
                                console.log("main window not found");
                            }
                        }
                        break;
                    case "Enter":
                        // 鼠标悬浮，显示主窗口
                        console.log(`mouse hovered tray at ${event.rect.position.x}, ${event.rect.position.y}`);
                        break;
                    case "Leave":
                        // 鼠标悬浮，隐藏主窗口
                        console.log(`mouse left tray at ${event.rect.position.x}, ${event.rect.position.y}`);
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
            // MenuItem.new({
            //     id: "flash",
            //     text: "闪烁",
            //     action: async (id: string) => {
            //         console.log("onClick flash ... ");
            //         await this.flash(true);
            //     },
            // }),
            // MenuItem.new({
            //     id: "flash_off",
            //     text: "停止闪烁",
            //     action: async (id: string) => {
            //         console.log("onClick flash_off ... ");
            //         await this.flash(false);
            //     },
            // }),
            MenuItem.new({
                id: "exit",
                text: "退出",
                action: async (id: string) => {
                    console.log("onClick exit(1) ... ");
                    await exit(1);
                },
            }),
        ]);
        return Menu.new({ items });
    }
}

const tray = new Tray();

export default tray;
