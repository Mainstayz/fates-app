<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import * as Select from "$lib/components/ui/select";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Calendar } from "$lib/components/ui/calendar";

    export let onSubmit:
        | ((event: { title: string; tags: string[]; color: string; startTime: Date; endTime: Date }) => void)
        | undefined = undefined;

    export let startTime = new Date();
    export let endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    let title = "";
    let tags = "";
    let color = "blue";
    let popoverOpen = false;

    // 添加日期和时间输入的辅助变量
    let startDateInput = formatDateForInput(startTime);
    let endDateInput = formatDateForInput(endTime);
    let startTimeInput = formatTimeForInput(startTime);
    let endTimeInput = formatTimeForInput(endTime);

    // 格式化日期为 YYYY-MM-DD 格式
    function formatDateForInput(date: Date): string {
        return date.toISOString().split("T")[0];
    }

    // 格式化时间为 HH:mm 格式
    function formatTimeForInput(date: Date): string {
        return date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    // 更新完整的日期时间
    function updateDateTime(dateStr: string, timeStr: string) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const [hours, minutes] = timeStr.split(":").map(Number);
        return new Date(year, month - 1, day, hours, minutes);
    }

    // 监听日期和时间变化
    $: {
        startTime = updateDateTime(startDateInput, startTimeInput);
    }

    $: {
        endTime = updateDateTime(endDateInput, endTimeInput);
    }

    // 如果 endTime 在 startTime 之前，自动调整 endTime
    $: {
        if (endTime < startTime) {
            endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
            endDateInput = formatDateForInput(endTime);
            endTimeInput = formatTimeForInput(endTime);
        }
    }

    const colors = [
        { value: "blue", label: "蓝色" },
        { value: "green", label: "绿色" },
        { value: "red", label: "红色" },
        { value: "yellow", label: "黄色" },
    ];

    function handleSubmit() {
        const eventData = {
            title,
            tags: tags.split(",").map((tag) => tag.trim()),
            color,
            startTime,
            endTime,
        };

        console.log(eventData);

        dispatch("submit", eventData);

        if (onSubmit) {
            onSubmit(eventData);
        }

        title = "";
        tags = "";
        color = "blue";
        startTime = new Date();
        endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
        popoverOpen = false;
    }

    function formatDateTime(date: Date): string {
        return date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function getColorLabel(value: string) {
        return colors.find((c) => c.value === value)?.label ?? "选择颜色";
    }

    // 添加日期类型
    type DateValue = Date | undefined;
</script>

<Popover.Root bind:open={popoverOpen}>
    <Popover.Trigger>
        <Button variant="outline">
            <Plus class="h-4 w-4 mr-2" />
            Add
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-80">
        <form class="grid gap-4" on:submit|preventDefault={handleSubmit}>
            <div class="grid gap-2">
                <Label for="title">标题</Label>
                <Input id="title" bind:value={title} placeholder="输入事件标题" />
            </div>

            <div class="grid gap-2">
                <Label for="startTime">开始时间</Label>
                <div class="grid grid-cols-2 gap-2">
                    <Input type="date" id="startDate" bind:value={startDateInput} />
                    <Input type="time" id="startTime" bind:value={startTimeInput} />
                </div>
            </div>

            <div class="grid gap-2">
                <Label for="endTime">结束时间</Label>
                <div class="grid grid-cols-2 gap-2">
                    <Input type="date" id="endDate" bind:value={endDateInput} />
                    <Input type="time" id="endTime" bind:value={endTimeInput} />
                </div>
            </div>

            <div class="grid gap-2">
                <Label for="tags">标签</Label>
                <Input id="tags" bind:value={tags} placeholder="输入标签，用逗号分隔" />
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
    </Popover.Content>
</Popover.Root>
