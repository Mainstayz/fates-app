<script lang="ts">
    import App from "./app.svelte";
    import { platform } from "@tauri-apps/plugin-os";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWin } from "../windows";
    import { onMount } from "svelte";
    import { LogicalPosition } from "@tauri-apps/api/window";
    export let messageBoxWindowWidth = 280;
    export let messageBoxWindowHeight = 100;

    let unlisteners: Array<() => void> = [];
    async function setupMessageBoxWin() {
        const win = await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: messageBoxWindowWidth,
            height: messageBoxWindowHeight,
            decorations: false,
            resizable: false,
            alwaysOnTop: true,
            center: false,
            visible: false,
            shadow: false,
        });

        const unlisten = await listen("tray_mouseenter", async (event) => {
            console.log("tray_mouseenter", event);
            const mainWindow = await getWin("main");
            if (mainWindow && (await mainWindow.isFocused())) {
                console.log("main window is focused");
                return;
            }
            const win = await getWin("message-box");
            if (!win) {
                return;
            }
            if (await win.isVisible()) {
                console.log("message box is visible");
                return;
            }
            let position = event.payload as { x: number; y: number };
            await win.setAlwaysOnTop(true);
            await win.setFocus();
            let x = (position.x - messageBoxWindowWidth / 2) / window.devicePixelRatio;
            // 判断是 Windows 还是 macOS
            const platformName = await platform();
            let y = 0;
            if (platformName.toLowerCase() === "macos") {
                y = 30;
            } else {
                y = (position.y - messageBoxWindowHeight / 2) / window.devicePixelRatio;
            }

            console.log("x, y", x, y);
            await win.setPosition(new LogicalPosition(x, y));
            await win.show();
        });
        unlisteners.push(unlisten);

        // 检测鼠标移出窗口

        // const unlisten2 = await listen("tray_mouseleave", async (event) => {
        //     console.log("tray_mouseleave", event);
        //     const win = await getWin("message-box");
        //     if (win) {
        //         await win.hide();
        //     }
        // });
        // unlisteners.push(unlisten2);

        // tauri://blur
        const unlisten3 = await listen("tauri://blur", async (event) => {
            console.log("tauri://blur", event);
            const win = await getWin("message-box");
            if (win) {
                await win.hide();
            }
        });
        unlisteners.push(unlisten3);
    }
    onMount(() => {
        // windows
        // linux
        // macos
        // android
        // ios
        console.log("platform: ", platform());
        setupMessageBoxWin();
        return () => {
            unlisteners.forEach((unlisten) => unlisten?.());
        };
    });
</script>

<main class="noSelect w-full h-full">
    <App />
</main>

<style>
    .noSelect {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    .noSelect:focus {
        outline: none !important;
    }
</style>
