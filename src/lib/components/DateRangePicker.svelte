<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Calendar, Clock, Check } from "lucide-svelte";

    let { startDate, endDate } = $props();

    function isSameDay(date1: string, date2: string): boolean {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (
            d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
        );
    }
    function formatDateForInput(date: Date): string {
        return date.toISOString().slice(0, 16);
    }

    function formatDisplayDate(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }

    function formatDisplayTime(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    let isEditing = $state(false);

    function toggleEdit() {
        isEditing = true;
    }

    function handleConfirm() {
        isEditing = false;
    }
</script>

<div class="relative w-full">
    {#if isEditing}
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
                <div class="relative flex-1">
                    <Input type="datetime-local" bind:value={startDate} class="bg-background h-[32px] w-[152px]" />
                </div>
                <span class="text-gray-500">-</span>
                <div class="relative flex-1">
                    <Input type="datetime-local" bind:value={endDate} class="bg-background h-[32px] w-[152px]" />
                </div>
                <Button variant="ghost" size="icon" class="h-[32px] w-[32px]" onclick={handleConfirm}>
                    <Check class="h-4 w-4" />
                </Button>
            </div>
        </div>
    {:else}
        <Button variant="ghost" class="w-full justify-start px-2 font-normal h-[32px]" onclick={toggleEdit}>
            <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4" />
                {#if isSameDay(startDate, endDate)}
                    <span>{formatDisplayDate(startDate)}</span>
                    <Clock class="w-4 h-4 ml-2" />
                    <span>{formatDisplayTime(startDate)} - {formatDisplayTime(endDate)}</span>
                {:else}
                    <span>{formatDisplayDate(startDate)} {formatDisplayTime(startDate)}</span>
                    <span class="mx-1">-</span>
                    <span>{formatDisplayDate(endDate)} {formatDisplayTime(endDate)}</span>
                {/if}
            </div>
        </Button>
    {/if}
</div>
