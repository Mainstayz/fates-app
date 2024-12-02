<script lang="ts">
    import App from "./app.svelte";
    import { platform } from "@tauri-apps/plugin-os";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWin } from "../windows";
    import { onMount } from "svelte";
    import { LogicalPosition } from "@tauri-apps/api/window";
    import { MouseTrackerState } from "../mouse-tracker.svelte";
    import debounce from "debounce";

    // 配置常量
    const CONFIG = {
        messageBoxWidth: 280, // 消息框宽度
        messageBoxHeight: 100, // 消息框高度
        hideDelay: 200, // 隐藏延迟
        showDelay: 200, // 显示延迟
        macosYOffset: 30, // macOS 偏移量
    } as const;

    // 状态管理
    const state = {
        atLeastOnceInside: false, // 至少进入一次
        isInMessageBox: false, // 是否在消息框内
        hoverInTray: false, // 是否在托盘上
        unlisteners: [] as Array<() => void>, // 监听器列表
    };

    const mouseTrackerState = new MouseTrackerState();

    // 计算窗口位置
    function calculateWindowPosition(x: number) {
        const platformName = platform().toLowerCase();
        const y =
            platformName === "macos"
                ? CONFIG.macosYOffset
                : (window.screen.availHeight - CONFIG.messageBoxHeight) / window.devicePixelRatio;

        return {
            x: (x - CONFIG.messageBoxWidth / 2) / window.devicePixelRatio,
            y,
        };
    }

    // 窗口显示逻辑
    async function showMessageBoxWin(event: any) {
        const win = await getWin("message-box");
        if (!win || (await win.isVisible())) return;

        const position = event.payload as { x: number; y: number };
        const { x, y } = calculateWindowPosition(position.x);

        await win.setFocus();
        await win.setPosition(new LogicalPosition(x, y));
        await win.show();
        await win.setFocus();

        const bounds = { x, y, width: CONFIG.messageBoxWidth, height: CONFIG.messageBoxHeight };
        mouseTrackerState.updateWindowBounds(bounds);
        mouseTrackerState.resume();
    }

    // 窗口隐藏逻辑
    async function hideMessageBoxWin() {
        state.atLeastOnceInside = false;
        const win = await getWin("message-box");
        if (win) {
            mouseTrackerState.pause();
            await win.hide();
        }
    }

    const debounceShowMessageBoxWin = debounce(showMessageBoxWin, CONFIG.showDelay);
    const debounceHideMessageBoxWin = debounce(hideMessageBoxWin, CONFIG.hideDelay);

    // 初始化消息框窗口
    async function setupMessageBoxWin() {
        await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: CONFIG.messageBoxWidth,
            height: CONFIG.messageBoxHeight,
            decorations: false,
            resizable: false,
            alwaysOnTop: true,
            center: false,
            visible: false,
            shadow: false,
        });

        // 注册事件监听器
        const listeners = [
            [
                "tray_mouseenter",
                (event: any) => {
                    state.hoverInTray = true;
                    debounceShowMessageBoxWin(event);
                },
            ],
            [
                "tray_mouseleave",
                () => {
                    state.hoverInTray = false;
                    // 延迟 200ms 后隐藏窗口
                    setTimeout(() => {
                        if (!state.isInMessageBox) {
                            hideMessageBoxWin();
                        }
                    }, CONFIG.hideDelay);
                },
            ],
        ] as const;

        // 注册所有监听器
        for (const [event, handler] of listeners) {
            const unlisten = await listen(event, handler);
            state.unlisteners.push(unlisten);
        }
    }

    onMount(() => {
        mouseTrackerState.init();
        mouseTrackerState.setIsInsideCallback((isInside) => {
            state.isInMessageBox = isInside;

            // 配置是否首次进入
            if (isInside && !state.atLeastOnceInside) {
                state.atLeastOnceInside = true;
                return;
            }

            if (state.atLeastOnceInside && !isInside && !state.hoverInTray) {
                debounceHideMessageBoxWin();
            }
        });

        setupMessageBoxWin();

        return () => {
            mouseTrackerState.destroy();
            state.unlisteners.forEach((unlisten) => unlisten?.());
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
