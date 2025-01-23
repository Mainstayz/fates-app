<script lang="ts">
    // https://v2.tauri.app/reference/javascript/os/#platform-1
    import { invoke } from "@tauri-apps/api/core";
    import { platform } from "@tauri-apps/plugin-os";
    import { Button } from "$lib/components/ui/button";
    import { AlertCircle, CheckCircle2, XCircle, Loader2, Play } from "lucide-svelte";
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { t } from "svelte-i18n";

    let mockEnable = false;
    let mockData = [
        {
            id: "45678567567",
            title: "Meeting with John",
            description: "Meeting with John",
            start_time: "2024-01-01 10:00",
            end_time: "2024-01-01 11:00",
            priority: 0,
            type_: 3,
            sub_type: 1,
        },
    ];
    // 定义步骤状态类型
    type StepStatus = "pending" | "loading" | "success" | "warning" | "error";

    // 定义步骤接口
    interface Step {
        id: number;
        getStatus: (params: {
            currentStep: number;
            permissionStatus: number | null;
            eventCount: number | null;
            isLoading: boolean;
        }) => StepStatus;
        getText: (params: { permissionStatus: number | null; eventCount: number | null }) => string;
        getIcon: (
            status: StepStatus
        ) => typeof CheckCircle2 | typeof AlertCircle | typeof XCircle | typeof Loader2 | null;
    }

    // 定义步骤配置
    const steps: Step[] = [
        {
            id: 1,
            getStatus: ({ isLoading, currentStep, permissionStatus }) => {
                if (isLoading && currentStep === 0) return "loading";
                if (permissionStatus !== null) return "success";
                return "pending";
            },
            getText: () => $t("app.import.calendar.checkPermission"),
            getIcon: (status) => {
                switch (status) {
                    case "loading":
                        return Loader2;
                    case "success":
                        return CheckCircle2;
                    default:
                        return null;
                }
            },
        },
        {
            id: 2,
            getStatus: ({ permissionStatus }) => {
                if (permissionStatus === 3) return "success";
                if (permissionStatus === 0) return "warning";
                if (permissionStatus !== null) return "error";
                return "pending";
            },
            getText: ({ permissionStatus }) => {
                if (permissionStatus === 3) return $t("app.import.calendar.permissionGranted");
                if (permissionStatus === 0) return $t("app.import.calendar.permissionNotGranted");
                if (permissionStatus !== null) return $t("app.import.calendar.permissionDenied");
                return $t("app.import.calendar.permissionPending");
            },
            getIcon: (status) => {
                switch (status) {
                    case "success":
                        return CheckCircle2;
                    case "warning":
                        return AlertCircle;
                    case "error":
                        return XCircle;
                    default:
                        return null;
                }
            },
        },
        {
            id: 3,
            getStatus: ({ permissionStatus, eventCount }) => {
                if (eventCount !== null) {
                    return eventCount > 0 ? "success" : "warning";
                }
                if (permissionStatus === 3) return "pending";
                if (permissionStatus !== null) return "error";
                return "pending";
            },
            getText: ({ eventCount, permissionStatus }) => {
                if (eventCount !== null) {
                    return eventCount > 0
                        ? $t("app.import.calendar.fetchSuccess", { values: { count: eventCount } })
                        : $t("app.import.calendar.fetchNoData");
                }
                if (permissionStatus === 3 || permissionStatus === null) return $t("app.import.calendar.fetchData");
                return $t("app.import.calendar.fetchNoData");
            },
            getIcon: (status) => {
                switch (status) {
                    case "success":
                        return CheckCircle2;
                    case "warning":
                        return AlertCircle;
                    case "error":
                        return XCircle;
                    default:
                        return null;
                }
            },
        },
    ];

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

    async function checkPermissionAndGetEvents() {
        try {
            isLoading = true;
            currentStep = 0;
            setDataItems([]);
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (mockEnable) {
                permissionStatus = 3;
                eventCount = mockData.length;
                setDataItems(mockData);
                currentStep = 4;
                return;
            }

            // 检查权限
            permissionStatus = await invoke("get_calendar_permission_status");
            console.log("permissionStatus:", permissionStatus);

            if (permissionStatus === 0) {
                // 如果未授权，请求授权
                await invoke("request_calendar_access");
                // 重新检查权限状态
                permissionStatus = await invoke("get_calendar_permission_status");
            }

            if (permissionStatus === 3) {
                // 如果已授权，直接获取事件
                currentStep = 3;
                const events: any[] = await invoke("get_calendar_events");
                eventCount = Array.isArray(events) ? events.length : 0;
                setDataItems(events);
                currentStep = 4;
            } else {
                // 如果仍未授权，显示相应状态
                currentStep = 1;
            }
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

    // 初始化 currentStep
    onMount(() => {
        currentStep = 0;
        dataItems = [];
    });
</script>

<div class="space-y-4">
    <h3 class="font-semibold">{$t("app.import.calendar.guide")}</h3>
    <div class="space-y-4">
        <div class="mb-4">
            <Button variant="outline" disabled={isLoading} onclick={() => checkPermissionAndGetEvents()}>
                {#if isLoading}
                    <Loader2 class="w-4 h-4 animate-spin" />
                {:else}
                    <Play class="w-4 h-4" />
                {/if}
                {$t("app.import.calendar.getCalendarData")}
            </Button>
        </div>

        <ul class="space-y-3">
            {#each steps as step}
                {@const status = step.getStatus({ currentStep, permissionStatus, eventCount, isLoading })}
                {@const Icon = step.getIcon(status)}
                <li class="flex items-center gap-2">
                    {#if Icon}
                        <Icon
                            class="w-4 h-4 {status === 'success'
                                ? 'text-green-500'
                                : status === 'warning'
                                  ? 'text-yellow-500'
                                  : status === 'error'
                                    ? 'text-red-500'
                                    : ''}
                                {status === 'loading' ? 'animate-spin' : ''}"
                        />
                    {:else}
                        <div class="w-4 h-4 rounded-full border"></div>
                    {/if}
                    <span>{step.getText({ permissionStatus, eventCount })}</span>
                </li>
            {/each}
        </ul>

        {#if permissionStatus !== null && permissionStatus !== 3}
            <div class="mt-4">
                <Button variant="outline" onclick={() => openSettings()}
                    >{$t("app.import.calendar.openSettings")}</Button
                >
            </div>
        {/if}
    </div>

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
