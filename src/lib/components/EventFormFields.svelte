<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { z } from "zod";
    import { updateDateTime, formatDateForInput, formatTimeForInput } from "$lib/utils";
    import Tagify from "@yaireo/tagify";
    import "@yaireo/tagify/dist/tagify.css";
    import { tagStore } from "$lib/stores/tagStore";

    // 修改为接收 onSubmit 回调函数
    let {
        title = $bindable(""),
        tags = $bindable(""),
        color = $bindable("blue" as const),
        startDateInput = $bindable(formatDateForInput(new Date())),
        startTimeInput = $bindable(formatTimeForInput(new Date())),
        endDateInput = $bindable(formatDateForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        endTimeInput = $bindable(formatTimeForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        onSubmit = $bindable(
            (data: {
                title: string;
                tags: string[];
                color: "blue" | "green" | "red" | "yellow";
                startTime: Date;
                endTime: Date;
            }) => {}
        ),
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
        timeRange: undefined,
    });
    // 优先级
    const colors = [
        { value: "blue", label: "普通任务" },
        { value: "green", label: "低优先级" },
        { value: "red", label: "高优先级" },
        { value: "yellow", label: "中优先级" },
    ] as const;

    function getColorLabel(value: string) {
        return colors.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    // 表单验证 schema
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
            timeRange: undefined,
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
                endTime: endDateTime,
            });
        }
    }

    let tagifyInput: HTMLInputElement;
    let tagify: Tagify;

    // 修改订阅标签存储部分
    let historicalTags: string[] = [];

    // 初始加载历史标签
    tagStore.getTags().then((tags) => {
        historicalTags = tags;
        // 如果 tagify 已经初始化，立即更新白名单
        if (tagify) {
            tagify.whitelist = tags;
        }
    });

    $effect(() => {
        if (tagifyInput) {
            tagify = new Tagify(tagifyInput, {
                maxTags: 3,
                backspace: true,
                placeholder: "输入标签",
                dropdown: {
                    enabled: 0,
                    classname: "tags-look",
                    maxItems: 10,
                    closeOnSelect: false,
                },
                whitelist: historicalTags,
            });

            // 同步 tags 值并保存新标签
            tagify.on("add", async () => {
                const tagifyValue = tagify.value;
                const newTags = tagifyValue.map((tag: { value: string }) => tag.value);
                tags = newTags.join(",");

                // 保存新标签到存储并更新建议列表
                const updatedTags = await tagStore.addTags(newTags);
                historicalTags = updatedTags;
                tagify.settings.whitelist = updatedTags;
            });

            // 初始化已有的标签
            if (tags) {
                const initialTags = tags
                    .split(",")
                    .map((tag: string) => tag.trim())
                    .filter(Boolean);
                tagify.addTags(initialTags);
                // 保存初始标签到存储
                tagStore.addTags(initialTags).then((updatedTags) => {
                    historicalTags = updatedTags;
                    tagify.settings.whitelist = updatedTags;
                });
            }
        }

        return () => {
            if (tagify) {
                tagify.destroy();
            }
        };
    });
</script>

<form
    class="grid gap-4"
    onsubmit={(e: { preventDefault: () => void }) => {
        e.preventDefault();
        handleSubmit();
    }}
>
    <div class="grid gap-2">
        <Label for="title">标题</Label>
        <Input type="text" autocomplete="off" bind:value={title} placeholder="输入任务标题" />
        {#if errors.title}
            <span class="text-sm text-destructive">
                {errors.title}
            </span>
        {/if}
    </div>

    <div class="grid gap-2">
        <Label for="tags">标签</Label>
        <input bind:this={tagifyInput} name="tags" class={`tagify-input ${errors.tags ? "border-destructive" : ""}`} />
        {#if errors.tags}
            <span class="text-sm text-destructive">
                {errors.tags}
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
        <Label for="color">优先级</Label>
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

<style>
    :global([type="text"]),
    :global([type="date"]),
    :global([type="time"]) {
        background-color: var(--background) !important;
    }
    /* <input
    class="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50" type="text" autocomplete="off" placeholder="输入任务标题">
    */
    :global(.tagify) {
        --placeholder-color: var(--muted-foreground);
        --placeholder-color-focus: var(--muted-foreground);

        background-color: var(--background);
        border-radius: var(--radius);

        border: 1px solid var(--border);
        font-size: 0.875rem;
        height: 2.5rem;
    }
    :global(.tagify--focus) {
        border-color: var(--foreground);
    }

    /*

    :global(.tagify:hover) {
        border-color: var(--input);
    }

    :global(.tagify.border-destructive) {
        border-color: var(--destructive);
    }

    :global(.tagify__tag) {
        background-color: var(--primary);
        color: var(--primary-foreground);
    }

    :global(.tagify__tag__removeBtn) {
        color: var(--primary-foreground);
        opacity: 0.75;
    }

    :global(.tagify__tag__removeBtn:hover) {
        opacity: 1;
    }

    :global(.tagify__input) {
        color: var(--foreground);
    } */

    :global(.tags-look) {
        border-width: 0px;
        margin-top: 2px;
    }

    /* tagify__dropdown__wrapper */
    :global(.tagify__dropdown__wrapper) {
        border-width: 0px;
    }

    /* 标签下拉框样式 */
    :global(.tags-look .tagify__dropdown__item) {
        display: inline-block;
        border-radius: 3px;
        padding: 0.3em 0.5em;
        border: 1px solid #ccc;
        background: #f3f3f3;
        margin: 0.2em;
        font-size: 0.85em;
        color: black;
        transition: 0s;
    }

    :global(.tags-look .tagify__dropdown__item--active) {
        color: black;
    }

    :global(.tags-look .tagify__dropdown__item:hover) {
        background: lightyellow;
        border-color: gold;
    }
</style>
