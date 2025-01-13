<script lang="ts">
    export let position = "bottom-right"; // 默认位置：右下角，可选值：'top-left', 'top-right', 'bottom-left', 'bottom-right'

    let isVisible = true; // 控制显示/隐藏
    let isUploadBlinking = false; // 控制左箭头闪动
    let isDownloadBlinking = false; // 控制右箭头闪动

    // 显示方法
    export function show() {
        isVisible = true;
    }

    // 隐藏方法
    export function hide() {
        isVisible = false;
    }

    // 控制左箭头闪动
    export function toggleUploadBlinking(state: boolean) {
        isUploadBlinking = state;
    }

    // 控制右箭头闪动
    export function toggleDownloadBlinking(state: boolean) {
        isDownloadBlinking = state;
    }

    // 动态类，用于根据位置设置组件位置
    const positionClasses: Record<string, string> = {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-right": "bottom-4 right-4",
    };
</script>

<div class={`fixed flex items-center space-x-4 ${isVisible ? "block" : "hidden"} ${positionClasses[position]}`}>
    <!-- 向上箭头 (上传) -->
    {#if isUploadBlinking}
        <svg
            class={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${isUploadBlinking ? "animate-pulse" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
    {/if}

    <!-- 向下箭头 (下载) -->
    {#if isDownloadBlinking}
        <svg
            class={`w-6 h-6 text-muted-foreground transition-transform duration-300 animate-pulse`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    {/if}
</div>
