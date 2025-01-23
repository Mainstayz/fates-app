<script lang="ts">
    // https://v2.tauri.app/reference/javascript/os/#platform-1
    import { invoke } from "@tauri-apps/api/core";
    import { platform } from "@tauri-apps/plugin-os";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    function isMac() {
        return platform() === "macos";
    }
    function isWindows() {
        return platform() === "windows";
    }
</script>

<div class="space-y-4">HELLO</div>
