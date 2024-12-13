<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import RepeatTimeSelector from "$lib/components/RepeatTimeSelector.svelte";
    import * as Popover from "$lib/components/ui/popover";

    export let row: any;
    export let column: any;
    export let value: string;
    export let onUpdateValue: (rowId: string, columnId: string, value: string) => void;

    let startTime = "08:00";
    let endTime = "12:00";
    let selectedDays = [1, 2, 3, 4, 5];
    let excludeHolidays = true;
    let description = "";

    function handleUpdate() {
        const newValue = `${description} ${startTime}-${endTime}`;
        console.log(newValue);
        onUpdateValue(row.id, column.id, newValue);
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            handleUpdate();
        }
    }
</script>

<Popover.Root onOpenChange={handleOpenChange}>
    <Popover.Trigger>
        <Button variant="ghost" class="h-8 w-full justify-start p-2 font-normal">
            {value || "点击设置"}
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[300px] p-0">
        <RepeatTimeSelector bind:startTime bind:endTime bind:selectedDays bind:excludeHolidays bind:description />
    </Popover.Content>
</Popover.Root>
