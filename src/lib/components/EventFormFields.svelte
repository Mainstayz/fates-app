<script lang="ts">
    // 1. 将导入语句按功能分组并添加注释
    // UI Components
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { Flame, Zap, Leaf, Circle } from "lucide-svelte";

    // Third-party libraries
    import { z } from "zod";
    // import Tagify from "@yaireo/tagify";
    // import "@yaireo/tagify/dist/tagify.css";

    // Utils & Stores
    import { updateDateTime, formatDateForInput, formatTimeForInput } from "$lib/utils";
    import { tagStore } from "$lib/utils/tagStore";
    import { CircleHelp } from "lucide-svelte";
    import { tagPriorityStore } from "$lib/utils/tagPriorityStore";

    // 2. 将类型定义移到顶部
    type EventFormData = {
        title: string;
        tags: string[];
        color: "blue" | "green" | "red" | "yellow";
        startTime: Date;
        endTime: Date;
    };

    // 3. 将常量配置集中管理
    const COLORS = [
        { value: "blue", label: "普通任务", icon: Circle },
        { value: "green", label: "低优先级", icon: Leaf },
        { value: "red", label: "高优先级", icon: Flame },
        { value: "yellow", label: "中优先级", icon: Zap },
    ] as const;

    const TAGIFY_CONFIG = {
        maxTags: 3,
        backspace: true,
        placeholder: "输入标签",
        dropdown: {
            enabled: 1,
            classname: "tags-look",
            maxItems: 5,
            closeOnSelect: false,
        },
    };

    // 4. Props 定义更简洁
    let {
        title = $bindable(""),
        tags = $bindable(""),
        color = $bindable("blue" as const),
        startDateInput = $bindable(formatDateForInput(new Date())),
        startTimeInput = $bindable(formatTimeForInput(new Date())),
        endDateInput = $bindable(formatDateForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        endTimeInput = $bindable(formatTimeForInput(new Date(Date.now() + 2 * 60 * 60 * 1000))),
        onSubmit = $bindable((data: EventFormData) => {}),
    } = $props();

    // 单错误状态
    let errors = $state<Record<string, string | undefined>>({
        title: undefined,
        tags: undefined,
        startDate: undefined,
        endDate: undefined,
        timeRange: undefined,
    });

    function getColorLabel(value: string) {
        return COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    // 表单验证相关函数分组
    const formSchema = z.object({
        title: z.string().min(1, "标题不能为空"),
        tags: z.string(),
        color: z.enum(["blue", "green", "red", "yellow"]),
        startDate: z.string().min(1, "请选择开始日期"),
        startTime: z.string().min(1, "请选择开始时间"),
        endDate: z.string().min(1, "请选择结束日期"),
        endTime: z.string().min(1, "请选择结束时间"),
    });

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
        console.log("🔍 开始表单验证");
        resetErrors();

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
            console.log("✅ Zod schema 验证通过");

            return validateTimeRange();
        } catch (error) {
            console.error("❌ 表单验证失败:", error);
            handleValidationError(error);
            return false;
        }
    }

    function resetErrors() {
        errors = {
            title: undefined,
            tags: undefined,
            startDate: undefined,
            endDate: undefined,
            timeRange: undefined,
        };
    }

    function handleValidationError(error: unknown) {
        if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
                if (err.path) {
                    errors[err.path[0] as keyof typeof errors] = err.message;
                }
            });
        }
    }

    async function handleSubmit() {
        console.log("📝 提交表单，当前数据：", {
            title,
            tags,
            color,
            startDateInput,
            startTimeInput,
            endDateInput,
            endTimeInput,
        });

        if (validateForm()) {
            const startDateTime = updateDateTime(startDateInput, startTimeInput);
            const endDateTime = updateDateTime(endDateInput, endTimeInput);

            // 记录标签和优先级的关系
            const tagList = tags.split(",").map((tag: string) => tag.trim());
            if (tagList.length === 1) {
                await tagPriorityStore.addPriority(tagList[0], color);
            }

            onSubmit({
                title,
                tags: tagList,
                color,
                startTime: startDateTime,
                endTime: endDateTime,
            });
        }
    }

    let tagifyInput: HTMLInputElement;
    let tagify: any;

    // 修改订阅标签存储部分
    let historicalTags: string[] = [];

    // 初始加载历史标签
    tagStore.getTags().then((tags) => {
        console.log("📚 加载历史标签：", tags);
        const defaultTags = ["重要且紧急", "重要但不紧急", "不重要但紧急", "不重要也不紧急"];
        // 如果 tags 为不包含 defaultTags，则加上 defaultTags
        if (!tags.some((tag) => defaultTags.includes(tag))) {
            tags = [...defaultTags, ...tags];
        }
        historicalTags = tags;
        // 果 tagify 已经初始化，立即更新白名单
        if (tagify) {
            console.log("📝 更新 Tagify 白名单");
            tagify.whitelist = tags;
        }
    });

    $effect(() => {
        console.log("🏗️ Tagify 初始化开始");
        // if (tagifyInput) {
        //     tagify = new Tagify(tagifyInput, TAGIFY_CONFIG);
        //     console.log("📋 Tagify 配置：", TAGIFY_CONFIG);

        //     // 同步 tags 值并保存新标签
        //     tagify.on("add", async (e) => {
        //         console.log("➕ Tagify 添加标签：", e.detail);
        //         const tagifyValue = tagify.value;
        //         const newTags = tagifyValue.map((tag: { value: string }) => tag.value);
        //         console.log("📌 当前所有标签：", newTags);
        //         tags = newTags.join(",");

        //         // 保存新标签到存储并更新建议列表
        //         const updatedTags = await tagStore.addTags(newTags);
        //         historicalTags = updatedTags;
        //         tagify.whitelist = updatedTags;

        //         // 如果只有一个标签，检查是否有相关的优先级
        //         if (newTags.length === 1) {
        //             const suggestedColor = await tagPriorityStore.getMostUsedColorForTag(newTags[0]);
        //             if (suggestedColor) {
        //                 color = suggestedColor;
        //             }
        //         }

        //         // 如果标签数量达到最大值，禁用输入但保持可删除
        //         if (tagify.value.length >= (tagify.settings?.maxTags ?? 3)) {
        //             tagify.DOM.input.style.display = "none";
        //         }
        //     });

        // 修改 remove 事件处理
        // tagify.on("remove", (e) => {
        //     console.log("➖ Tagify 移除标签：", e.detail);
        //     const tagifyValue = tagify.value;
        //     const currentTags = tagifyValue.map((tag: { value: string }) => tag.value);
        //     console.log("📌 剩余标签：", currentTags);
        //     tags = currentTags.join(",");

        //     // 如果标签数量减少，重新显示输入框
        //     if (tagify.value.length < (tagify.settings?.maxTags ?? 3)) {
        //         tagify.DOM.input.style.display = ""; // 恢复输入框显示
        //     }
        // });

        // 初始化已有的标签
        // if (tags) {
        //     console.log("🔄 初始化现有标签:", tags);
        //     const initialTags = tags
        //         .split(",")
        //         .map((tag: string) => tag.trim())
        //         .filter(Boolean);

        //     tagify.removeAllTags();
        //     tagify.addTags(initialTags);
        //     // 保存初始标签到存储
        //     tagStore.addTags(initialTags).then((updatedTags) => {
        //         historicalTags = updatedTags;
        //         tagify.whitelist = updatedTags;
        //     });
        // }
        // }

        return () => {
            console.log("🧹 清理 Tagify 实例");
            // if (tagify) {
            //     // 移除事件监听
            //     tagify.off("add");
            //     tagify.off("remove");
            //     tagify.destroy();
            // }
        };
    });
</script>

<!-- 添加一个不见看的button，用于测试标签提交 -->
<button hidden onclick={handleSubmit}>提交</button>
<form
    class="grid gap-4"
    onsubmit={(e: { preventDefault: () => void }) => {
        e.preventDefault();
        handleSubmit();
    }}
>
    <div class="grid gap-2">
        <div class="flex items-center gap-2">
            <Label for="title">标题</Label>
            <!-- <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <CircleHelp class="w-3 h-3" tabindex={-1} />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <div class="space-y-3">
                            <div class="font-medium text-sm text-red-400">
                                避免笼统的描述，如 "系统开发"，因为看不出具体做什么。
                            </div>
                            <div class="font-medium text-sm">
                                具体描述示例：<span>"修复商品库存同步延迟的Bug"</span>
                            </div>
                            <div class="text-sm mb-2">建议使用以下公式记录：</div>
                            <div class="font-medium text-sm p-2 rounded">动作词 + 具体对象 + 预期结果【可选】</div>
                            <div class="text-sm mt-2">
                                例如：<span>"开发【什么功能】实现【什么目的】"</span>
                            </div>
                        </div>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider> -->
        </div>
        <Input type="text" autocomplete="off" bind:value={title} placeholder="输入任务标题" autofocus />
        {#if errors.title}
            <span class="text-sm text-destructive">
                {errors.title}
            </span>
        {/if}
    </div>

    <div class="grid gap-2">
        <div class="flex items-center gap-2">
            <Label for="tags">标签</Label>
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={100}>
                    <Tooltip.Trigger>
                        <CircleHelp class="w-3 h-3" tabindex={-1} />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        用于分类和筛选事件，如：重要且紧急、重要但不紧急、不重要但紧急、不重要也不紧急。
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
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

    <Button type="submit" class="w-full">提交</Button>
</form>

<style>
    /* :global([type="text"]),
    :global([type="date"]),
    :global([type="time"]) {
        background-color: var(--background) !important;
    } */
    /* <input
    class="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50" type="text" autocomplete="off" placeholder="输入任务标题">
    */
    :global(.tagify) {
        --placeholder-color: var(--muted-foreground);
        --placeholder-color-focus: var(--muted-foreground);
        --tag-inset-shadow-size: 10em;
        flex-wrap: nowrap;

        background-color: var(--background);
        border-radius: var(--radius);

        border: 1px solid var(--border);
        font-size: 0.875rem;
        min-height: 2.5rem;
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
        flex-wrap: nowrap;
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
