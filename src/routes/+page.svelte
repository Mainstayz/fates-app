<script lang="ts">
    import App from "./app.svelte";
    import { platform } from "@tauri-apps/plugin-os";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWindowByLabel } from "../windows";
    import { onMount } from "svelte";
    import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
    import { MouseTrackerState } from "../mouse-tracker.svelte";
    import debounce from "debounce";

    const devicePixelRatio = window.devicePixelRatio;
    // 消息框宽度，单位：逻辑像素
    const messageBoxWidth = 280;
    // 消息框高度，单位：逻辑像素
    const messageBoxHeight = 100;

    // 配置常量
    const CONFIG = {
        hideDelay: 200, // 隐藏延迟
        showDelay: 200, // 显示延迟
        macosYOffset: 74, // macOS 任务栏高度，单位：物理像素
    } as const;

    // 状态管理
    const state = {
        atLeastOnceInside: false, // 至少进入一次
        isInMessageBox: false, // 是否在消息框内
        unlisteners: [] as Array<() => void>, // 监听器列表
    };

    const mouseTrackerState = new MouseTrackerState();

    // 计算窗口位置
    function calculatePhysicalPosition(x: number) {
        const platformName = platform().toLowerCase();

        const y = platformName === "macos" ? CONFIG.macosYOffset : window.screen.availHeight - messageBoxHeight;

        // 向下取整
        return {
            x: Math.floor(x - messageBoxWidth / 2),
            y: Math.floor(y),
        };
    }

    // 窗口显示逻辑
    async function showMessageBoxWin(event: any) {
        const win = await getWindowByLabel("message-box");
        if (!win || (await win.isVisible())) return;

        // x, y
        const mouse_position = event.payload.mouse_position as [number, number];
        // x, y, width, height
        const tray_rect = event.payload.tray_rect as [number, number, number, number];

        // 逻辑单位
        const { x, y } = calculatePhysicalPosition(mouse_position[0]);

        await win.setFocus();
        // 使用物理单位
        const physicalWidth = messageBoxWidth * devicePixelRatio;
        const physicalHeight = messageBoxHeight * devicePixelRatio;

        await win.setPosition(new PhysicalPosition(x, y));
        await win.setSize(new PhysicalSize(physicalWidth, physicalHeight));
        await win.show();
        await win.setFocus();

        const rect1 = {
            x: x,
            y: y,
            width: physicalWidth,
            height: physicalHeight,
        };
        // 物理单位
        const rect2 = { x: tray_rect[0], y: tray_rect[1], width: tray_rect[2], height: tray_rect[3] };
        mouseTrackerState.updateWindowRect([rect1, rect2]);
        mouseTrackerState.resume();
    }

    // 窗口隐藏逻辑
    async function hideMessageBoxWin() {
        state.atLeastOnceInside = false;
        const win = await getWindowByLabel("message-box");
        if (win) {
            mouseTrackerState.pause();
            await win.hide();
        }
    }

    const debounceShowMessageBoxWin = debounce(showMessageBoxWin, CONFIG.showDelay);
    const debounceHideMessageBoxWin = debounce(hideMessageBoxWin, CONFIG.hideDelay);

    // 初始化消息框窗口
    async function setupMessageBoxWin() {
        let messageBoxWin = await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: messageBoxWidth,
            height: messageBoxHeight,
            decorations: false,
            resizable: false,
            alwaysOnTop: true,
            center: false,
            visible: false,
            shadow: false,
        });

        // 注册事件监听器
        let listeners = [
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

        // 注册 flur
        const unlistenBlur = await messageBoxWin.listen("tauri://blur", (event) => {
            debounceHideMessageBoxWin();
        });

        state.unlisteners.push(unlistenBlur);
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
