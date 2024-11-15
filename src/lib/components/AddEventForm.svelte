<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import EventFormFields from "./EventFormFields.svelte";
    import { createEventDispatcher } from "svelte";

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

        // 重置表单
        title = "";
        tags = "";
        color = "blue";
        startTime = new Date();
        endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
        startDateInput = formatDateForInput(startTime);
        startTimeInput = formatTimeForInput(startTime);
        endDateInput = formatDateForInput(endTime);
        endTimeInput = formatTimeForInput(endTime);
        popoverOpen = false;
    }
</script>

<Popover.Root bind:open={popoverOpen}>
    <Popover.Trigger>
        <Button variant="outline">
            <Plus class="h-4 w-4 mr-2" />
            Add
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
