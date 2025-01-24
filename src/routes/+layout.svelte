<script lang="ts">
    import { ModeWatcher } from "mode-watcher";
    import { Toaster } from "$lib/components/ui/sonner/index.js";
    import "../app.css";
    let { children } = $props();
</script>

<!-- <nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/settings">Settings</a>
</nav> -->

<ModeWatcher />
<Toaster />
{@render children()}
