<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Textarea } from "$lib/components/ui/textarea";
    import { PanelTop, Plus, Circle, Leaf, Flame, Zap, Timer, Text } from "lucide-svelte";
    import TagsAddButton from "./TagsAddButton.svelte";
    import DateRangePicker from "./DateRangePicker.svelte";

    const COLORS = [
        { value: "blue", label: "普通任务", icon: Circle },
        { value: "green", label: "低优先级", icon: Leaf },
        { value: "red", label: "高优先级", icon: Flame },
        { value: "yellow", label: "中优先级", icon: Zap },
    ] as const;

    let title = $state("");
    let description = $state("");
    let color = $state("blue");
    let startDate = $state(formatDateForInput(new Date()));
    let endDate = $state(formatDateForInput(new Date()));
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
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    <div class="flex-1 flex-col pr-[20px]">
        <!-- 标题 -->
        <div class="flex flex-row gap-2">
            <div class="w-[24px] pt-[6px]">
                <PanelTop size={24} />
            </div>
            <Input
                type="text"
                class="flex-1 bg-background border-0 shadow-none font-bold text-xl pl-[12px]"
                bind:value={title}
                placeholder="任务标题"
            />
        </div>
        <!-- Tags，以及 优先级 -->
        <div class="flex flex-row gap-2">
            <div class="w-[24px]"></div>
            <div class="flex flex-1 gap-8 pl-[12px]">
                <div class="w-[160px]">
                    <div class="text-sm text-gray-500 mb-1">优先级</div>
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
                <div class="flex-1">
                    <div class="text-sm text-gray-500 mb-1">标签</div>
                    <div>
                        <TagsAddButton />
                    </div>
                </div>
            </div>
        </div>
        <!-- 时间 -->
        <div class="flex flex-row gap-2">
            <div class="w-[24px] pt-[6px]">
                <Timer size={24} />
            </div>
            <div class="flex flex-1 pl-[12px]">
                <div class="w-full">
                    <Label class="text-sm text-gray-500 mb-1">时间</Label>
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            </div>
        </div>
        <!-- 详情 -->
        <div class="flex flex-row gap-2 pt-[8px]">
            <div class="pt-[2px] w-[24px]">
                <Text size={24} />
            </div>
            <div class="flex flex-col gap-1 flex-1 pl-[12px]">
                <!-- 描述 -->
                <Label for="description" class="text-lg text-gray-500">描述</Label>
                <!-- 关闭自动高度 -->
                <Textarea
                    id="description"
                    placeholder="添加详细描述..."
                    bind:value={description}
                    class="bg-secondary w-full h-[100px] border-0 shadow-none resize-none"
                />
            </div>
        </div>
    </div>
</div>

<style>
</style>
