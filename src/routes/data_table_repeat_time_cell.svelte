<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import RepeatTimeSelector from "$lib/components/RepeatTimeSelector.svelte";
    import * as Popover from "$lib/components/ui/popover";
    import { generateDescription, parseRepeatTimeString } from "$lib/utils/repeatTime";

    export let row: any;
    export let column: any;
    export let value = "62|08:00|12:00"; // 默认周一到周五
    export let onUpdateValue: (rowId: string, columnId: string, value: string) => void;

    let displayValue = value;
    let repeatTimeValue = value;

    $: {
        try {
            const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(value);
            const description = generateDescription(weekdaysBits);
            displayValue = `${description} ${startTime}-${endTime}`;
        } catch {
            displayValue = value || "点击设置";
        }
    }

    function handleChange(event: CustomEvent<string>) {
        repeatTimeValue = event.detail;
        const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(repeatTimeValue);
        const description = generateDescription(weekdaysBits);
        const displayValue = `${description} ${startTime}-${endTime}`;
        onUpdateValue(row.id, column.id, repeatTimeValue);
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(repeatTimeValue);
            const description = generateDescription(weekdaysBits);
            const displayValue = `${description} ${startTime}-${endTime}`;
            onUpdateValue(row.id, column.id, repeatTimeValue);
        }
    }
</script>

<Popover.Root onOpenChange={handleOpenChange}>
    <Popover.Trigger>
        <Button variant="ghost" class="h-8 w-full justify-start p-2 font-normal">
            {displayValue}
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[300px] p-0">
        <RepeatTimeSelector value={repeatTimeValue} on:change={handleChange} />
    </Popover.Content>
</Popover.Root>
