<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { PanelTop, Plus, Circle, Leaf, Flame, Zap, CalendarRange } from "lucide-svelte";
    import TagsAddButton from "./TagsAddButton.svelte";

    const COLORS = [
        { value: "blue", label: "普通任务", icon: Circle },
        { value: "green", label: "低优先级", icon: Leaf },
        { value: "red", label: "高优先级", icon: Flame },
        { value: "yellow", label: "中优先级", icon: Zap },
    ] as const;

    let title = $state("");
    let color = $state("blue");
    let startDate = $state(formatDateForInput(new Date()));
    let startTime = $state(formatTimeForInput(new Date()));
    let endDate = $state(formatDateForInput(new Date()));
    let endTime = $state(formatTimeForInput(new Date()));
    let priority = $state("medium");
    let estimatedTime = $state(0);
    title = "今天似乎是个好日子";

    const PRIORITY_OPTIONS = [
        { value: "high", label: "高优先级" },
        { value: "medium", label: "中优先级" },
        { value: "low", label: "低优先级" },
    ];

    function getColorLabel(value: string) {
        return COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    // 格式化日期为 YYYY-MM-DD 格式
    export function formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // 格式化时间为 HH:mm 格式
    export function formatTimeForInput(date: Date): string {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }
</script>

<!-- 水平布局 -->
<div class="flex flex-row">
    <div class="flex-1 flex-col pr-[80px]">
        <!-- 标题 -->
        <div class="flex flex-row gap-2">
            <div class="pt-[6px]">
                <PanelTop size={24} class="mb-2" />
            </div>
            <Input
                type="text"
                class="border-0 shadow-none font-bold text-xl"
                bind:value={title}
                placeholder="任务标题"
            />
        </div>
        <!-- Tags，以及 优先级 -->
        <div class="flex flex-row gap-2 pt-[8px]">
            <!-- Icon -->
            <div class="pt-[6px] w-[24px]"></div>
            <div class="flex flex-row pl-[12px] gap-2">
                <div class="flex-col">
                    <div class="text-sm text-gray-500">标签</div>
                    <div class="text-sm text-gray-500">
                        <TagsAddButton />
                    </div>
                </div>
                <div class="flex-col">
                    <div class="text-sm text-gray-500">优先级</div>
                    <div class="h-[32px]">
                        <Select.Root type="single" bind:value={color}>
                            <Select.Trigger class="w-full h-[32px]">
                                {#if color}
                                    <div class="flex items-center gap-2">
                                        {#if color}
                                            {@const Icon = COLORS.find((c) => c.value === color)?.icon}
                                            <Icon
                                                class={`w-4 h-4 ${
                                                    color === "red"
                                                        ? "text-red-500"
                                                        : color === "yellow"
                                                          ? "text-yellow-500"
                                                          : color === "green"
                                                            ? "text-green-500"
                                                            : "text-blue-500"
                                                }`}
                                            />
                                        {/if}
                                        {getColorLabel(color)}
                                    </div>
                                {/if}
                            </Select.Trigger>
                            <Select.Content>
                                {#each COLORS as colorOption}
                                    <Select.Item value={colorOption.value}>
                                        {@const Icon = colorOption.icon}
                                        <div class="flex items-center gap-2">
                                            <Icon
                                                class={`w-4 h-4 ${
                                                    colorOption.value === "red"
                                                        ? "text-red-500"
                                                        : colorOption.value === "yellow"
                                                          ? "text-yellow-500"
                                                          : colorOption.value === "green"
                                                            ? "text-green-500"
                                                            : "text-blue-500"
                                                }`}
                                            />
                                            {colorOption.label}
                                        </div>
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>
            </div>
        </div>
        <!-- 时间 -->
        <div class="flex flex-row gap-2 pt-[8px]">
            <div class="pt-[6px] w-[24px]">
                <CalendarRange size={24} />
            </div>
            <div class="flex pl-[12px] items-center">
                <span class="text-gray-500">预计耗时</span>
                <Input
                    type="number"
                    bind:value={estimatedTime}
                    class="w-fit h-[32px] border-0 shadow-none "
                    min="0"
                    step="0.1"
                    size={4}
                />
                <span class="text-gray-500">小时</span>
            </div>
            <!-- <div class="flex flex-col gap-2">

                <div class="flex-1 pl-[12px]">
                    <Label for="startDate" class="text-sm text-gray-500">开始时间</Label>
                    <div class="flex gap-2">
                        <Input type="date" id="startDate" bind:value={startDate} class="w-[120px] h-[32px]" />
                        <Input type="time" id="startTime" bind:value={startTime} class="w-[80px] h-[32px]" />
                    </div>
                </div>
                <div class="flex-1 pl-[12px]">
                    <Label for="endDate" class="text-sm text-gray-500">结束时间</Label>
                    <div class="flex gap-2">
                        <Input type="date" id="endDate" bind:value={endDate} class="w-[120px] h-[32px]" />
                        <Input type="time" id="endTime" bind:value={endTime} class="w-[80px] h-[32px]" />
                    </div>
                </div>
            </div> -->
        </div>
    </div>
</div>

<style>
</style>
