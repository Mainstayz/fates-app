<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import EventFormFields from "./EventFormFields.svelte";
    import { createEventDispatcher } from "svelte";
    import { formatDateForInput, formatTimeForInput, updateDateTime } from "$lib/utils";

    // 使用 $state 来确保状态更新是响应式的
    let popoverOpen = $state(false);
    const dispatch = createEventDispatcher();

    $inspect(popoverOpen);

    // 表单数据
    let title = $state("");
    let tags = $state("");
    let color = $state("blue" as const);
    let startDateInput = $state(formatDateForInput(new Date()));
    let endDateInput = $state(formatDateForInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    let startTimeInput = $state(formatTimeForInput(new Date()));
    let endTimeInput = $state(formatTimeForInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));

    function handleSubmit(formData: {
        title: string;
        tags: string[];
        color: "blue" | "green" | "red" | "yellow";
        startTime: Date;
        endTime: Date;
    }) {
        dispatch("submit", formData);
        resetForm();
    }

    function resetForm() {
        title = "";
        tags = "";
        color = "blue";
        const now = new Date();
        startDateInput = formatDateForInput(now);
        startTimeInput = formatTimeForInput(now);
        endDateInput = formatDateForInput(new Date(now.getTime() + 2 * 60 * 60 * 1000));
        endTimeInput = formatTimeForInput(new Date(now.getTime() + 2 * 60 * 60 * 1000));
        popoverOpen = false;
    }
</script>

<Popover.Root bind:open={popoverOpen}>
    <Popover.Trigger>
        <Button variant="default">
            <Plus/>
            添加任务
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-80">
        <EventFormFields
            {title}
            {tags}
            {color}
            {startDateInput}
            {startTimeInput}
            {endDateInput}
            {endTimeInput}
            onSubmit={handleSubmit}
        />
    </Popover.Content>
</Popover.Root>
