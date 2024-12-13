<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import { createEventDispatcher } from "svelte";
    import { WEEKDAY_LABELS, EXCLUDE_HOLIDAYS_BIT, generateDescription } from "$lib/utils/repeatTime";
    import type { RepeatTimeValue } from "$lib/utils/repeatTime";

    export let value: string;

    const dispatch = createEventDispatcher<{
        change: string;
    }>();

    let weekdaysBits: number;
    let startTime: string;
    let endTime: string;
    let excludeHolidays: boolean;

    $: {
        const [bits, start, end] = value.split("|");
        weekdaysBits = parseInt(bits);
        startTime = start;
        endTime = end;
        excludeHolidays = !!(weekdaysBits & EXCLUDE_HOLIDAYS_BIT);
    }

    $: if (excludeHolidays !== undefined) {
        updateValue();
    }

    function toggleDay(dayIndex: number) {
        const bit = 1 << dayIndex;
        weekdaysBits = weekdaysBits & bit ? weekdaysBits & ~bit : weekdaysBits | bit;
        updateValue();
    }

    function updateValue() {
        let newBits = weekdaysBits & ~EXCLUDE_HOLIDAYS_BIT;
        if (excludeHolidays) {
            newBits |= EXCLUDE_HOLIDAYS_BIT;
        }
        const newValue = `${newBits}|${startTime}|${endTime}`;
        value = newValue;
        dispatch("change", newValue);
    }

    $: description = generateDescription(weekdaysBits);
</script>

<div class="w-[300px] rounded-lg border bg-white p-4 shadow-sm">
    <div class="space-y-4">
        <div class="flex flex-col gap-1">
            <Label class="text-xl font-bold">任务重复添加时间段</Label>
            <Label class="text-sm text-gray-500">{description}</Label>
        </div>

        <div>
            <div class="flex items-center gap-4">
                <Input
                    type="time"
                    bind:value={startTime}
                    class="bg-gray-100 font-bold border-none p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[48px]"
                />

                <span class="text-gray-500">至</span>
                <Input
                    type="time"
                    bind:value={endTime}
                    class="bg-background font-bold border-none p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[48px]"
                />
            </div>
        </div>

        <div class="flex gap-1">
            {#each WEEKDAY_LABELS as label, index}
                <button
                    class="h-8 w-8 rounded-full text-sm {!!(weekdaysBits & (1 << index))
                        ? 'bg-blue-500 text-[#fff]'
                        : 'bg-gray-100 '}"
                    on:click={() => toggleDay(index)}
                >
                    {label}
                </button>
            {/each}
        </div>

        <div class="flex items-center justify-between">
            <Label for="exclude-holidays" class="font-bold">忽略法定节假日</Label>
            <Switch id="exclude-holidays" bind:checked={excludeHolidays} />
        </div>
    </div>
</div>
