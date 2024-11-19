<script lang="ts">
    import App from "./app.svelte";
</script>

<main class="noSelect">
    <App />

</main>

<style>
    /* 可以删除之前的样式，因为现在使用 Tailwind CSS */
    /* :global(.container) {
        -webkit-tap-highlight-color: transparent;
    } */
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
