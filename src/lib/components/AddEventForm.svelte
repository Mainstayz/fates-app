<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import EventFormFields from "./EventFormFields.svelte";
    import { createEventDispatcher } from "svelte";

    // 添加 isEdit 和 editData 属性
    export let isEdit = false;
    export let editData: {
        title: string;
        tags: string[];
        color: string;
        start: string | Date;
        end: string | Date;
    } | null = null;

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

    // 当 editData 变化时，更新表单数据
    $: if (editData) {
        title = editData.title;
        tags = editData.tags.join(", ");
        color = editData.color;
        const startDate = new Date(editData.start);
        const endDate = new Date(editData.end);
        startDateInput = formatDateForInput(startDate);
        startTimeInput = formatTimeForInput(startDate);
        endDateInput = formatDateForInput(endDate);
        endTimeInput = formatTimeForInput(endDate);
        if (isEdit) {
            popoverOpen = true;
        }
    }

    // 格式化日期为 YYYY-MM-DD 格式
    function formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化时间为 HH:mm 格式
    function formatTimeForInput(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 更新完整的日期时间
    function updateDateTime(dateStr: string, timeStr: string): Date {
        const [year, month, day] = dateStr.split("-").map(Number);
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setFullYear(year);
        date.setMonth(month - 1);
        date.setDate(day);
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    // 监听日期和时间变化
    $: {
        startTime = updateDateTime(startDateInput, startTimeInput);
    }

    $: {
        endTime = updateDateTime(endDateInput, endTimeInput);
    }

    const dispatch = createEventDispatcher();

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

        resetForm();
    }

    // 提取重置表单的逻辑到单独的函数
    function resetForm() {
        title = "";
        tags = "";
        color = "blue";
        const now = new Date();
        startTime = now;
        endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        startDateInput = formatDateForInput(startTime);
        startTimeInput = formatTimeForInput(startTime);
        endDateInput = formatDateForInput(endTime);
        endTimeInput = formatTimeForInput(endTime);
        popoverOpen = false;
        isEdit = false;
        editData = null;
    }

    // 添加关闭弹窗时的处理
    function handlePopoverClose() {
        if (isEdit) {
            resetForm();
        }
    }
</script>

<Popover.Root bind:open={popoverOpen} onOpenChange={handlePopoverClose}>
    <Popover.Trigger>
        <Button variant={isEdit ? "outline" : "default"}>
            <Plus class="h-4 w-4 mr-2" />
            {isEdit ? 'Edit' : 'Add'}
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-80">
        <EventFormFields
            bind:title
            bind:tags
            bind:color
            bind:startDateInput
            bind:startTimeInput
            bind:endDateInput
            bind:endTimeInput
            on:submit={handleSubmit}
        />
    </Popover.Content>
</Popover.Root>
