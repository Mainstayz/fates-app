<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { z } from "zod";

    export let title = "";
    export let tags = "";
    export let color = "blue";
    export let startDateInput = "";
    export let startTimeInput = "";
    export let endDateInput = "";
    export let endTimeInput = "";

    // 表单错误状态
    let errors: {
        title?: string;
        tags?: string;
        startDate?: string;
        endDate?: string;
    } = {};

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

    function validateForm() {
        errors = {};
        try {
            formSchema.parse({
                title,
                tags,
                color,
                startDate: startDateInput,
                startTime: startTimeInput,
                endDate: endDateInput,
                endTime: endTimeInput,
            });
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
            // 只有验证通过才触发submit事件
            dispatch('submit');
        }
    }

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
</script>

<form class="grid gap-4" on:submit|preventDefault={handleSubmit}>
    <div class="grid gap-2">
        <Label for="title">标题</Label>
        <Input
            id="title"
            bind:value={title}
            placeholder="输入事件标题"
            class={errors.title ? "border-red-500" : ""}
        />
        {#if errors.title}
            <span class="text-sm text-red-500">{errors.title}</span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="startTime">开始时间</Label>
        <div class="grid grid-cols-2 gap-2">
            <Input
                type="date"
                id="startDate"
                bind:value={startDateInput}
                class={errors.startDate ? "border-red-500" : ""}
            />
            <Input
                type="time"
                id="startTime"
                bind:value={startTimeInput}
                class={errors.startDate ? "border-red-500" : ""}
            />
        </div>
        {#if errors.startDate}
            <span class="text-sm text-red-500">{errors.startDate}</span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="endTime">结束时间</Label>
        <div class="grid grid-cols-2 gap-2">
            <Input
                type="date"
                id="endDate"
                bind:value={endDateInput}
                class={errors.endDate ? "border-red-500" : ""}
            />
            <Input
                type="time"
                id="endTime"
                bind:value={endTimeInput}
                class={errors.endDate ? "border-red-500" : ""}
            />
        </div>
        {#if errors.endDate}
            <span class="text-sm text-red-500">{errors.endDate}</span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="tags">标签</Label>
        <Input
            id="tags"
            bind:value={tags}
            placeholder="输入标签，用逗号分隔"
            class={errors.tags ? "border-red-500" : ""}
        />
        {#if errors.tags}
            <span class="text-sm text-red-500">{errors.tags}</span>
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
