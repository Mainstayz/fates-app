<script lang="ts">
    import App from "./app.svelte";
    import { listen } from "@tauri-apps/api/event";
    import { createWindow, getWin } from "../windows";
    import { onMount } from "svelte";
    import { LogicalPosition } from '@tauri-apps/api/window'

    export let messageBoxWindowWidth = 280
    export let messageBoxWindowHeight = 100

    let unlisteners: Array<() => void> = [];
    async function setupMessageBoxWin() {
        const win = await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: messageBoxWindowWidth,
            height: messageBoxWindowHeight,
            decorations: true,
            resizable: false,
            alwaysOnTop: true,
            center: true,
            visible: true,
        });

        const unlisten = await listen("tray_mouseenter", async (event) => {
            console.log("tray_mouseenter", event);
            const win = await getWin("message-box");
            if (win) {
                let position = event.payload as { x: number, y: number };
                await win.setAlwaysOnTop(true);
                await win.setFocus();
                // await win.setPosition(new LogicalPosition(position.x - messageBoxWindowWidth / 2, window.screen.availHeight - messageBoxWindowHeight))
                await win.show();
            }
        });

        const unlisten2 = await listen("tray_mouseleave", async (event) => {
            console.log("tray_mouseleave", event);
            const win = await getWin("message-box");
            if (win) {
                await win.hide();
            }
        });

        // tauri://blur
        const unlisten3 = await listen("tauri://blur", async (event) => {
            console.log("tauri://blur", event);
            const win = await getWin("message-box");
            if (win) {
                await win.hide();
            }
        });

        unlisteners.push(unlisten);
        unlisteners.push(unlisten2);
        unlisteners.push(unlisten3);

    }
    onMount( () => {
        setupMessageBoxWin();
        return () => {
            unlisteners.forEach(unlisten => unlisten?.());
        };
    });

    setupMessageBoxWin();
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
