<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import EventFormFields from "./EventFormFields.svelte";
    import { createEventDispatcher } from "svelte";
    import { formatDateForInput, formatTimeForInput, updateDateTime } from "$lib/utils";

    let popoverOpen = false;
    const dispatch = createEventDispatcher();

    // 表单数据
    let title = "";
    let tags = "";
    let color = "blue" as const;
    let startDateInput = formatDateForInput(new Date());
    let endDateInput = formatDateForInput(new Date(Date.now() + 2 * 60 * 60 * 1000));
    let startTimeInput = formatTimeForInput(new Date());
    let endTimeInput = formatTimeForInput(new Date(Date.now() + 2 * 60 * 60 * 1000));

    function handleSubmit() {
        const startDateTime = updateDateTime(startDateInput, startTimeInput);
        const endDateTime = updateDateTime(endDateInput, endTimeInput);

        const eventData = {
            title,
            tags: tags.split(",").map((tag) => tag.trim()),
            color,
            startTime: startDateTime,
            endTime: endDateTime,
        };

        console.log(eventData);
        dispatch("submit", eventData);
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
