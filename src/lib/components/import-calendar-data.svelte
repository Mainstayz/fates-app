<script lang="ts">
    // https://v2.tauri.app/reference/javascript/os/#platform-1
    import { invoke } from "@tauri-apps/api/core";
    import { platform } from "@tauri-apps/plugin-os";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { AlertCircle, CheckCircle2, XCircle } from "lucide-svelte";
    import { onMount } from "svelte";

    let permissionStatus: number | null = null;
    let isLoading = false;
    let eventCount: number | null = null;
    let error: string | null = null;

    async function checkPermission() {
        try {
            isLoading = true;
            permissionStatus = await invoke("get_calendar_permission_status");
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function requestPermission() {
        try {
            isLoading = true;
            await invoke("request_calendar_access");
            await checkPermission();
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function getEvents() {
        try {
            isLoading = true;
            const events = await invoke("get_calendar_events");
            eventCount = Array.isArray(events) ? events.length : 0;
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function openSettings() {
        try {
            await invoke("open_calendar_setting");
        } catch (err: any) {
            error = err.message || "未知错误";
        }
    }

    function isMac() {
        return platform() === "macos";
    }
    function isWindows() {
        return platform() === "windows";
    }
</script>

<div class="space-y-4">
    {#if permissionStatus === null}
        <div class="text-center space-y-4">
            <p>Fates 需要访问您的日历，以获取您的今年的日程安排。</p>
            <Button disabled={isLoading} onclick={() => checkPermission()}>检查权限</Button>
        </div>
    {:else if permissionStatus === 0}
        <div class="text-center space-y-4">
            <div class="flex justify-center">
                <AlertCircle class="w-8 h-8 text-yellow-500" />
            </div>
            <Button disabled={isLoading} onclick={() => requestPermission()}>请求授权</Button>
        </div>
    {:else if permissionStatus === 3}
        <div class="text-center space-y-4">
            <div class="flex justify-center">
                <CheckCircle2 class="w-8 h-8 text-green-500" />
            </div>
            {#if eventCount === null}
                <Button disabled={isLoading} onclick={() => getEvents()}>开始获取数据</Button>
            {:else}
                <p>
                    {eventCount > 0 ? `已获取 ${eventCount} 个事件` : "没有事件"}
                </p>
            {/if}
        </div>
    {:else}
        <div class="text-center space-y-4">
            <div class="flex justify-center">
                <XCircle class="w-8 h-8 text-red-500" />
            </div>
            <Button disabled={isLoading} onclick={() => openSettings()}>打开系统设置</Button>
        </div>
    {/if}

    {#if error}
        <div class="text-red-500 text-center mt-4">
            {error}
        </div>
    {/if}
</div>
