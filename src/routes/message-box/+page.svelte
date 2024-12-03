<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { load } from "@tauri-apps/plugin-store";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    let { title = "", description = "" }: { title: string; description: string } = $props();

    let unlisten: UnlistenFn | void;

    let rootElement: HTMLElement;
    let pageHeight: number = 0;
    let resizeObserver: ResizeObserver;

    function handleGlobalClick(event: MouseEvent) {
        console.log("Global click:", {
            x: event.clientX,
            y: event.clientY,
            target: event.target,
        });
    }

    async function setupListenEvent() {
        unlisten = await listen<{ title: string; description: string }>("notification-message", (event) => {
            console.log(event.payload);
            try {
                const json_object = event.payload;
                title = json_object.title;
                description = json_object.description;
            } catch (error) {
                console.error("Failed to parse notification message:", error);
            }
        }).catch((error) => {
            console.error("Failed to listen notification message:", error);
        });
    }

    // 更新高度的函数
    function updateHeight() {
        if (rootElement) {
            pageHeight = rootElement.clientHeight;
            console.log("Updated height:", pageHeight);
            getCurrentWindow().emitTo("main", "message-box-height", pageHeight);
        }
    }

    async function loadMessageBoxData() {
        const store = await load("message-box.json", { autoSave: false });
        title = (await store.get<string>("title")) || "";
        description = (await store.get<string>("body")) || "";
    }

    onMount(() => {
        // 加载消息框数据
        loadMessageBoxData().then(() => {
            console.log("加载消息框数据成功");
        });

        setupListenEvent();

        // 添加全局点击事件监听
        document.addEventListener("click", handleGlobalClick);

        resizeObserver = new ResizeObserver((entries) => {
            updateHeight();
        });

        // 开始观察元素
        if (rootElement) {
            resizeObserver.observe(rootElement);
        }

        return () => {
            unlisten?.();
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    });
    onDestroy(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });
</script>

<div bind:this={rootElement}>
    <Alert.Root class="py-2 px-3">
        <Alert.Title class="font-semibold">{title}</Alert.Title>
        <Alert.Description>
            <p>{description}</p>
        </Alert.Description>
    </Alert.Root>
</div>

<style>
    :global(body) {
        background-color: transparent !important;
    }
</style>
