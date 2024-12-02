<script lang="ts">
    import App from "./app.svelte";
    import { platform } from "@tauri-apps/plugin-os";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWin } from "../windows";
    import { onMount } from "svelte";
    import { LogicalPosition } from "@tauri-apps/api/window";
    import { MouseTrackerState } from "../mouse-tracker.svelte";
    import debounce from "debounce";

    export let messageBoxWindowWidth = 280;
    export let messageBoxWindowHeight = 100;

    // 初始化 MouseTrackerState
    const mouseTrackerState = new MouseTrackerState();

    let unlisteners: Array<() => void> = [];

    // At least once inside.
    let atLeastOnceInside = false;
    let isInMessageBox = false;
    let hoverInTray = false;

    async function showMessageBoxWin(event: any) {
        // const mainWindow = await getWin("main");
        // if (mainWindow && (await mainWindow.isVisible()) && (await mainWindow.isFocused())) {
        //     console.log("main window is focused");
        //     return;
        // }

        const win = await getWin("message-box");
        if (!win) {
            console.error("message box window not found");
            return;
        }
        if (await win.isVisible()) {
            console.log("message box is visible");
            return;
        }

        let position = event.payload as { x: number; y: number };
        let x = (position.x - messageBoxWindowWidth / 2) / window.devicePixelRatio;
        const platformName = platform();
        let y = 0;
        if (platformName.toLowerCase() === "macos") {
            y = 30;
        } else {
            y = (window.screen.availHeight - messageBoxWindowHeight) / window.devicePixelRatio;
            console.log(
                "window.screen.availHeight",
                window.screen.availHeight,
                "messageBoxWindowHeight",
                messageBoxWindowHeight,
                "y",
                y
            );
        }

        await win.setFocus();
        const newPosition = new LogicalPosition(x, y);
        await win.setPosition(newPosition);
        await win.show();
        await win.setFocus();
        // 获取窗口的 bounds
        const bounds = {
            x: x,
            y: y,
            width: messageBoxWindowWidth,
            height: messageBoxWindowHeight,
        };
        mouseTrackerState.updateWindowBounds(bounds);
        mouseTrackerState.resume();
    }

    let debounceShowMessageBoxWin = debounce(showMessageBoxWin, 200);

    async function hideMessageBoxWin() {
        isInMessageBox = false;
        atLeastOnceInside = false;
        const win = await getWin("message-box");
        if (win) {
            mouseTrackerState.pause();
            await win.hide();
        }
    }
    let debounceHideMessageBoxWin = debounce(hideMessageBoxWin, 200);

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
            hoverInTray = true;
            debounceShowMessageBoxWin(event);
        });
        unlisteners.push(unlisten);

        const unlisten2 = await listen("tray_mouseleave", async (event) => {
            // 延迟 100ms 后隐藏窗口
            hoverInTray = false;
            setTimeout(async () => {
                console.log("tray_mouseleave, isInMessageBox: ", isInMessageBox);
                if (!isInMessageBox) {
                    debounceHideMessageBoxWin();
                }
            }, 200);
        });
        unlisteners.push(unlisten2);

        // const unlisten3 = await listen("tauri://blur", async (event) => {
        //     isInMessageBox = false;
        //     const win = await getWin("message-box");
        //     if (win) {
        //         await win.hide();
        //         mouseTrackerState.pause();
        //     }
        // });
        // unlisteners.push(unlisten3);
    }

    onMount(() => {
        mouseTrackerState.init();
        mouseTrackerState.setIsInsideCallback((isInside) => {
            isInMessageBox = isInside;

            // 至少进入一次后，进入时不再显示窗口
            if (isInside && !atLeastOnceInside) {
                atLeastOnceInside = true;
                return;
            }

            if (atLeastOnceInside && !isInside && !hoverInTray) {
                // 至少进入一次后，离开时延迟 200ms 后隐藏窗口
                atLeastOnceInside = false;
                debounceHideMessageBoxWin();
            }
        });
        setupMessageBoxWin();
        return () => {
            // 清理工作：销毁 mouse-tracker 和其他监听器
            mouseTrackerState.destroy();
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
