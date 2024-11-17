<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { z } from "zod";
    import { updateDateTime, formatDateForInput, formatTimeForInput } from "$lib/utils";

    // 修改为接收 onSubmit 回调函数
    let {
        title = $bindable(""),
        tags = $bindable(""),
        color = $bindable("blue" as const),
        startDateInput = $bindable(formatDateForInput(new Date())),
        startTimeInput = $bindable(formatTimeForInput(new Date())),
        endDateInput = $bindable(formatDateForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        endTimeInput = $bindable(formatTimeForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        onSubmit = $bindable((data: {
            title: string;
            tags: string[];
            color: "blue" | "green" | "red" | "yellow";
            startTime: Date;
            endTime: Date;
        }) => {})
    } = $props<{
        title?: string;
        tags?: string;
        color?: "blue" | "green" | "red" | "yellow";
        startDateInput?: string;
        startTimeInput?: string;
        endDateInput?: string;
        endTimeInput?: string;
        onSubmit?: (data: {
            title: string;
            tags: string[];
            color: "blue" | "green" | "red" | "yellow";
            startTime: Date;
            endTime: Date;
        }) => void;
    }>();

    // 单错误状态
    let errors = $state<Record<string, string | undefined>>({
        title: undefined,
        tags: undefined,
        startDate: undefined,
        endDate: undefined,
        timeRange: undefined
    });

    const colors = [
        { value: "blue", label: "蓝色" },
        { value: "green", label: "绿色" },
        { value: "red", label: "红色" },
        { value: "yellow", label: "黄色" },
    ] as const;

    function getColorLabel(value: string) {
        return colors.find((c) => c.value === value)?.label ?? "选择颜色";
    }

    // 表单验证schema
    const formSchema = z.object({
        title: z.string().min(1, "标题不能为空"),
        tags: z.string(),
        color: z.enum(["blue", "green", "red", "yellow"]),
        startDate: z.string().min(1, "请选择开始日期"),
        startTime: z.string().min(1, "请选择开始时间"),
        endDate: z.string().min(1, "请选择结束日期"),
        endTime: z.string().min(1, "请选择结束时间"),
    });

    // 验证时间范围
    function validateTimeRange(): boolean {
        const startDateTime = updateDateTime(startDateInput, startTimeInput);
        const endDateTime = updateDateTime(endDateInput, endTimeInput);

        if (endDateTime <= startDateTime) {
            errors.timeRange = "结束时间必须晚于开始时间";
            return false;
        }
        return true;
    }

    function validateForm() {
        errors = {
            title: undefined,
            tags: undefined,
            startDate: undefined,
            endDate: undefined,
            timeRange: undefined
        };
        try {
            // 首先验证基本字段
            formSchema.parse({
                title,
                tags,
                color,
                startDate: startDateInput,
                startTime: startTimeInput,
                endDate: endDateInput,
                endTime: endTimeInput,
            });

            // 然后验证时间范围
            if (!validateTimeRange()) {
                return false;
            }

            return true;
        } catch (error) {
            if (error instanceof z.ZodError) {
                error.errors.forEach((err) => {
                    if (err.path) {
                        errors[err.path[0] as keyof typeof errors] = err.message;
                    }
                });
            }
            return false;
        }
    }

    function handleSubmit() {
        if (validateForm()) {
            const startDateTime = updateDateTime(startDateInput, startTimeInput);
            const endDateTime = updateDateTime(endDateInput, endTimeInput);

            // 使用回调函数而不是事件
            onSubmit({
                title,
                tags: tags.split(",").map((tag: string) => tag.trim()),
                color,
                startTime: startDateTime,
                endTime: endDateTime
            });
        }
    }
</script>

<form
    class="grid gap-4"
    onsubmit={e => {
        e.preventDefault();
        handleSubmit();
    }}
>
    <div class="grid gap-2">
        <Label for="title">标题</Label>
        <Input
            id="title"
            bind:value={title}
            placeholder="输入事件标题"
        />
        {#if errors.title}
            <span class="text-sm text-destructive">
                {errors.title}
            </span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="startTime">开始时间</Label>
        <div class="grid grid-cols-2 gap-2">
            <Input
                type="date"
                id="startDate"
                bind:value={startDateInput}
                class={errors.startDate || errors.timeRange ? "border-destructive" : ""}
            />
            <Input
                type="time"
                id="startTime"
                bind:value={startTimeInput}
                class={errors.startDate || errors.timeRange ? "border-destructive" : ""}
            />
        </div>
        {#if errors.startDate}
            <span class="text-sm text-destructive">
                {errors.startDate}
            </span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="endTime">结束时间</Label>
        <div class="grid grid-cols-2 gap-2">
            <Input
                type="date"
                id="endDate"
                bind:value={endDateInput}
                class={errors.endDate || errors.timeRange ? "border-destructive" : ""}
            />
            <Input
                type="time"
                id="endTime"
                bind:value={endTimeInput}
                class={errors.endDate || errors.timeRange ? "border-destructive" : ""}
            />
        </div>
        {#if errors.endDate}
            <span class="text-sm text-destructive">
                {errors.endDate}
            </span>
        {/if}
    </div>

    {#if errors.timeRange}
        <span class="text-sm text-destructive">
            {errors.timeRange}
        </span>
    {/if}

    <div class="grid gap-2">
        <Label for="tags">标签</Label>
        <Input
            id="tags"
            bind:value={tags}
            placeholder="输入标签，用逗号分隔"
            class={errors.tags ? "border-destructive" : ""}
        />
        {#if errors.tags}
            <span class="text-sm text-destructive">
                {errors.tags}
            </span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="color">颜色</Label>
        <Select.Root type="single" bind:value={color}>
            <Select.Trigger class="w-full">
                {getColorLabel(color)}
            </Select.Trigger>
            <Select.Content>
                {#each colors as colorOption}
                    <Select.Item value={colorOption.value}>
                        {colorOption.label}
                    </Select.Item>
                {/each}
            </Select.Content>
        </Select.Root>
    </div>

    <Button type="submit" class="w-full">提交</Button>
</form>
