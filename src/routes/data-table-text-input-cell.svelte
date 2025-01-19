<script lang="ts">
    import { Input } from "$lib/components/ui/input";

    let {
        rowId,
        value,
        disabled,
        onUpdateValue,
    }: { rowId: string; value: string; disabled: boolean; onUpdateValue: (rowId: string, newValue: string) => void } =
        $props();
    // export let rowId: string;
    // export let value: string;
    // export let disabled: boolean = false;
    // export let onUpdateValue: (rowId: string, newValue: string) => void;

    let tempValue = $state(value);

    const handleSubmit = () => {
        console.log("[DataTableTextInputCell] Submit", tempValue);
        onUpdateValue(rowId, tempValue);
    };
</script>

<Input
    type="text"
    class="bg-background border-0 shadow-none h-[24px] truncate font-bold"
    bind:value={tempValue}
    placeholder=""
    autofocus={false}
    {disabled}
    tabindex={-1}
    onfocusout={handleSubmit}
    onkeydown={(e) => {
        if (e.key === "Enter") {
            (e.target as HTMLElement).blur();
        }
    }}
/>
