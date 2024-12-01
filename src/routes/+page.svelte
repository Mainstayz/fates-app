<script lang="ts">
    import App from "./app.svelte";
    import { createWindow } from "../windows";

    createWindow("message-box", {
        title: "Message Box",
        url: "/message-box",
        width: 400,
        height: 320,
        decorations: true,
        resizable: true,
        alwaysOnTop: true,
        center: true,
    }).then((window) => {
        window.size().then((size) => {
            console.log(`window size: ${size}`);
        });
    }).catch((error) => {
        console.error(`window creation failed: ${error}`);
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
