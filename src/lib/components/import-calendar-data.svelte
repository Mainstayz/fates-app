<script lang="ts">
    // https://v2.tauri.app/reference/javascript/os/#platform-1
    import { invoke } from "@tauri-apps/api/core";
    import { platform } from "@tauri-apps/plugin-os";
    import { Button } from "$lib/components/ui/button";
    import { AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-svelte";
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";

    let permissionStatus: number | null = $state(null);
    let isLoading = $state(false);
    let eventCount: number | null = $state(null);
    let error: string | null = $state(null);
    let currentStep = $state(0);

    // dataItems
    let dataItems: any[] = $state([]);
    // callback
    let { callback }: { callback: (data: any) => void } = $props();
    // 设置 dataItems
    function setDataItems(data: any) {
        console.log("dataItems:", data);
        dataItems = data;
        if (callback) {
            callback(dataItems);
        } else {
            console.log("callback is not set");
        }
    }

    async function checkPermission() {
        try {
            isLoading = true;
            currentStep = 0;
            setDataItems([]);
            await new Promise((resolve) => setTimeout(resolve, 500));
            permissionStatus = await invoke("get_calendar_permission_status");
            if (permissionStatus === 3) {
                currentStep = 2; // 如果已授权，直接跳到"可以访问日历"
            } else {
                currentStep = 1; // 否则停在权限状态
            }
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function requestPermission() {
        try {
            isLoading = true;
            currentStep = 1;
            await new Promise((resolve) => setTimeout(resolve, 500));
            await invoke("request_calendar_access");
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function getEvents() {
        try {
            setDataItems([]);
            isLoading = true;
            currentStep = 3;
            await new Promise((resolve) => setTimeout(resolve, 500));
            const events: any[] = await invoke("get_calendar_events");
            eventCount = Array.isArray(events) ? events.length : 0;
            setDataItems(events);
            currentStep = 4;
        } catch (err: any) {
            error = err.message || "未知错误";
        } finally {
            isLoading = false;
        }
    }

    async function openSettings() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
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

    // 初始化 currentStep
    onMount(() => {
        currentStep = 0;
        dataItems = [];
    });
</script>

<div class="space-y-8 p-4">
    <!-- 第一组：权限检查 -->
    <div class="space-y-4">
        <!-- <h3 class="font-medium text-lg">权限检查</h3> -->
        {#if permissionStatus === null}
            <div class="mb-4">
                <Button disabled={isLoading} onclick={() => checkPermission()}>开始检查权限</Button>
            </div>
        {/if}

        <ul class="space-y-3">
            <li class="flex items-center gap-2">
                {#if isLoading && currentStep === 0}
                    <Loader2 class="w-4 h-4 animate-spin" />
                {:else if permissionStatus !== null}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {:else}
                    <div class="w-4 h-4 rounded-full border"></div>
                {/if}
                <span class:font-bold={currentStep === 0}> 开始检查日历访问权限 </span>
            </li>

            <li class="flex items-center gap-2">
                {#if permissionStatus === 3}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {:else if permissionStatus === 0}
                    <AlertCircle class="w-4 h-4 text-yellow-500" />
                {:else if permissionStatus !== null}
                    <XCircle class="w-4 h-4 text-red-500" />
                {:else}
                    <div class="w-4 h-4 rounded-full border"></div>
                {/if}
                <span class:font-bold={currentStep === 1}>
                    {#if permissionStatus === 3}
                        已授权日历访问权限
                    {:else if permissionStatus === 0}
                        未授权日历访问权限
                    {:else if permissionStatus !== null}
                        用户拒绝日历访问权限
                    {:else}
                        等待检查权限状态
                    {/if}
                </span>
            </li>

            <li class="flex items-center gap-2">
                {#if permissionStatus === 3}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {:else if permissionStatus !== null && permissionStatus !== 3}
                    <XCircle class="w-4 h-4 text-red-500" />
                {:else}
                    <div class="w-4 h-4 rounded-full border"></div>
                {/if}
                <span class:font-bold={currentStep === 2}>
                    {#if permissionStatus === 3}
                        可以访问日历
                    {:else if permissionStatus !== null}
                        无法访问日历
                    {:else}
                        等待权限验证
                    {/if}
                </span>
            </li>
        </ul>

        {#if permissionStatus === 0}
            <div class="mt-4 flex gap-2">
                <Button disabled={isLoading} onclick={() => requestPermission()}>请求授权</Button>
                <Button disabled={isLoading} onclick={() => checkPermission()}>重新检查权限</Button>
            </div>
        {:else if permissionStatus !== null && permissionStatus !== 3}
            <div class="mt-4">
                <Button onclick={() => openSettings()}>打开系统设置</Button>
                <Button onclick={() => checkPermission()}>重新检查权限</Button>
            </div>
        {/if}
    </div>

    <!-- 第二组：数据获取 -->
    {#if permissionStatus === 3}
        <div class="space-y-4">
            <!-- <h3 class="font-medium text-lg">数据获取</h3> -->

            {#if eventCount === null}
                <div class="mb-4">
                    <Button disabled={isLoading} onclick={() => getEvents()}>开始获取数据</Button>
                </div>
            {/if}

            <ul class="space-y-3">
                <li class="flex items-center gap-2">
                    {#if isLoading && eventCount === null}
                        <Loader2 class="w-4 h-4 animate-spin" />
                    {:else if eventCount !== null}
                        <CheckCircle2 class="w-4 h-4 text-green-500" />
                    {:else}
                        <div class="w-4 h-4 rounded-full border"></div>
                    {/if}
                    <span class:font-bold={currentStep === 3}> 尝试获取日程数据 </span>
                </li>

                <li class="flex items-center gap-2">
                    {#if eventCount !== null}
                        {#if eventCount > 0}
                            <CheckCircle2 class="w-4 h-4 text-green-500" />
                        {:else}
                            <AlertCircle class="w-4 h-4 text-yellow-500" />
                        {/if}
                    {:else}
                        <div class="w-4 h-4 rounded-full border"></div>
                    {/if}
                    <span class:font-bold={currentStep === 4}>
                        {#if eventCount !== null}
                            {#if eventCount > 0}
                                获取成功，已获取到 {eventCount} 条日程数据
                            {:else}
                                未获取到日程数据
                            {/if}
                        {:else}
                            等待获取数据
                        {/if}
                    </span>
                </li>
            </ul>
        </div>
    {/if}

    {#if error}
        <div class="text-red-500 text-center mt-4" transition:fade>
            {error}
        </div>
    {/if}
</div>

<style>
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
