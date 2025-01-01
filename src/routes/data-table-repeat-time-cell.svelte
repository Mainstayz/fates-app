<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import RepeatTimeSelector from "$lib/components/repeat-time-selector.svelte";
    import * as Popover from "$lib/components/ui/popover";
    import { generateDescription, parseRepeatTimeString } from "$lib/utils/repeatTime";

    export let rowId: string;
    export let value = "62|08:00|12:00"; // 默认周一到周五
    export let onUpdateValue: (rowId: string, value: string) => void;

    let repeatTimeValue = value;
    let bageValues: string[] = [];

    $: {
        try {
            const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(repeatTimeValue);
            const description = generateDescription(weekdaysBits);
            const conponents = description.split("|");
            const fixedValues = conponents.map((component) => {
                if (component.length == 2 && component.startsWith("周")) {
                    // 去掉周字
                    return component.slice(1);
                }
                return component;
            });
            bageValues = [...fixedValues, `${startTime}-${endTime}`];
        } catch {
            bageValues = [];
        }
    }

    function handleChange(newValue: string) {
        repeatTimeValue = newValue;
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            onUpdateValue(rowId, repeatTimeValue);
        }
    }
</script>

<Popover.Root onOpenChange={handleOpenChange}>
    <Popover.Trigger>
        <Button variant="ghost" class="h-8 w-full justify-start p-2 text-xs">
            {#if bageValues.length > 0}
                {#each bageValues as value}
                    <Badge variant="outline">
                        {value}
                    </Badge>
                {/each}
            {:else}
                -
            {/if}
        </Button>
    </Popover.Trigger>
    <Popover.Content
        class="w-[300px] p-0"
        trapFocus={false}
        onOpenAutoFocus={(e) => {
            e.preventDefault();
        }}
    >
        <RepeatTimeSelector value={repeatTimeValue} onUpdateValue={handleChange} />
    </Popover.Content>
</Popover.Root>
