<script lang="ts">
    import App from "./app.svelte";
    import { platform } from "@tauri-apps/plugin-os";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWin } from "../windows";
    import { onMount } from "svelte";
    import { LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
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
        console.log("showMessageBoxWin", event);
        const win = await getWin("message-box");
        if (!win || (await win.isVisible())) return;

        // x, y
        const mouse_position = event.payload.mouse_position as [number, number];
        // x, y, width, height
        const tray_rect = event.payload.tray_rect as [number, number, number, number];

        const { x, y } = calculateWindowPosition(mouse_position[0]);

        await win.setFocus();
        await win.setPosition(new LogicalPosition(x, y));
        await win.setSize(new LogicalSize(CONFIG.messageBoxWidth, CONFIG.messageBoxHeight));
        await win.show();
        await win.setFocus();

        const rect1 = { x, y, width: CONFIG.messageBoxWidth, height: CONFIG.messageBoxHeight };
        const rect2 = { x: tray_rect[0], y: tray_rect[1], width: tray_rect[2], height: tray_rect[3] };
        mouseTrackerState.updateWindowRect([rect1, rect2]);
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
                    debounceShowMessageBoxWin(event);
                },
            ],
            [
                "tray_mouseleave",
                () => {
                    // Not implemented
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
            console.log("isInMessageBox", isInside);
            // 配置是否首次进入
            if (isInside && !state.atLeastOnceInside) {
                state.atLeastOnceInside = true;
                return;
            }

            if (state.atLeastOnceInside && !isInside) {
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
