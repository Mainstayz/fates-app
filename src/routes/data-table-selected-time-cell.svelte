<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Check } from "lucide-svelte";
    import dayjs from "dayjs";
    import localeData from "dayjs/plugin/localeData";
    dayjs.extend(localeData);

    const Min = dayjs().startOf("year").subtract(1, "year").format("YYYY-MM-DDTHH:mm");
    const Max = dayjs().startOf("year").add(10, "year").format("YYYY-MM-DDTHH:mm");

    let {
        rowId,
        selectedTime,
        disabled,
        onUpdateValue,
    }: {
        rowId: string;
        selectedTime: string;
        disabled: boolean;
        onUpdateValue: (rowId: string, newValue: string) => void;
    } = $props();

    let isEditing = $state(false);
    console.log("Input Time", selectedTime);

    let tempTime = $state(selectedTime);

    $inspect("Current Time", tempTime);

    function formatDateTime(dateStr: string | null) {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return dayjs(date).format("YYYY-MM-DD HH:mm");
    }

    function toggleEdit() {
        isEditing = true;
    }

    function handleConfirm() {
        isEditing = false;
        if (!checkValidTime(tempTime)) {
            tempTime = "";
        }
        onUpdateValue(rowId, tempTime);
    }

    function handleChange(e: Event) {
        let value = (e.target as HTMLInputElement).value;

        // 判断格式
        if (!dayjs(value).isValid()) {
            console.warn("Invalid date format");
            tempTime = "";
            return;
        }

        // 有效性校验
        if (dayjs(value).isBefore(Min) || dayjs(value).isAfter(Max)) {
            console.warn("Date out of range");
            tempTime = "";
            return;
        }

        tempTime = value;
    }
    function checkValidTime(value: string) {
        if (!dayjs(value).isValid()) {
            console.warn("Invalid date format");
            return false;
        }
        let date = dayjs(value);
        if (date.isBefore(Min) || date.isAfter(Max)) {
            console.warn("Date out of range");
            return false;
        }
        return true;
    }
</script>

<div class="relative w-full">
    {#if isEditing}
        <div class="flex items-center gap-2 w-[192px]">
            <Input
                type="datetime-local"
                value={tempTime}
                class="bg-background h-[32px] w-[152px]"
                min={Min}
                max={Max}
                {disabled}
                onchange={handleChange}
                onfocusout={handleConfirm}
            />
            <Button variant="ghost" size="icon" class="h-8 w-8" onclick={handleConfirm}>
                <Check class="h-4 w-4" />
            </Button>
        </div>
    {:else}
        <Button variant="ghost" class="h-8 w-[192px] justify-start" onclick={toggleEdit} {disabled}>
            <!--  左对齐 -->
            <div class="flex">
                {formatDateTime(selectedTime)}
            </div>
        </Button>
    {/if}
</div>
