<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";

    export let value: string = "08:00 - 12:00";
    export let selectedDays: number[] = [1, 2, 3, 4, 5];
    export let excludeHolidays: boolean = true;

    const weekDays = [
        { value: 0, label: "日" },
        { value: 1, label: "一" },
        { value: 2, label: "二" },
        { value: 3, label: "三" },
        { value: 4, label: "四" },
        { value: 5, label: "五" },
        { value: 6, label: "六" },
    ];

    function toggleDay(day: number) {
        if (selectedDays.includes(day)) {
            selectedDays = selectedDays.filter((d) => d !== day);
        } else {
            selectedDays = [...selectedDays, day].sort();
        }
    }

    $: description = (() => {
        const isWorkDays =
            selectedDays.length === 5 &&
            [1, 2, 3, 4, 5].every((day) => selectedDays.includes(day)) &&
            ![0, 6].some((day) => selectedDays.includes(day));

        const isEveryDay = selectedDays.length === 7;

        if (isWorkDays) {
            return excludeHolidays ? "工作日" : "周一至周五";
        }

        if (isEveryDay) {
            return excludeHolidays ? "每天，除节假日" : "每天";
        }

        const dayLabels = selectedDays.map((day) => `周${weekDays.find((d) => d.value === day)?.label}`).join(" ");

        return excludeHolidays ? `${dayLabels} 除节假日` : dayLabels;
    })();
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
                    value={value.split(" - ")[0]}
                    oninput={(e) => {
                        const endTime = value.split(" - ")[1];
                        value = `${e.currentTarget.value} - ${endTime}`;
                    }}
                    class="bg-gray-100 font-bold border-none p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[42px]"
                />

                <span class=" text-gray-500"> 至 </span>
                <Input
                    type="time"
                    value={value.split(" - ")[1]}
                    oninput={(e) => {
                        const startTime = value.split(" - ")[0];
                        value = `${startTime} - ${e.currentTarget.value}`;
                    }}
                    class="bg-background font-bold border-none p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[42px]"
                />
            </div>
        </div>

        <div class="flex gap-1">
            {#each weekDays as day}
                <button
                    class="h-8 w-8 rounded-full text-sm {selectedDays.includes(day.value)
                        ? 'bg-blue-500 text-[#fff]'
                        : 'bg-gray-100 '}"
                    on:click={() => toggleDay(day.value)}
                >
                    {day.label}
                </button>
            {/each}
        </div>

        <div class="flex items-center justify-between">
            <Label for="exclude-holidays" class="font-bold">忽略法定节假日</Label>
            <Switch id="exclude-holidays" bind:checked={excludeHolidays} />
        </div>
    </div>
</div>
