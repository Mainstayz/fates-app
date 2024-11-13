<script lang="ts">
    import Timeline from "$lib/Timeline.svelte";
</script>

<main>
    <h1>时间线演示</h1>
    <Timeline
        zoomMin={1000 * 60 * 60 * 1}
        zoomMax={1000 * 60 * 60 * 24 * 7}
    />
</main>

<style>
    main {
        padding: 20px;
    }
</style>
