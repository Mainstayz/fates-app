<script lang="ts">
    import { Input } from "$lib/components/ui/input";

    export let rowId: string;
    export let value: string;
    export let disabled: boolean = false;
    export let onUpdateValue: (rowId: string, newValue: string) => void;

    const handleSubmit = () => {
        onUpdateValue(rowId, value);
    };
</script>

<Input
    type="text"
    class="bg-background border-0 shadow-none h-[24px] truncate font-bold"
    bind:value
    placeholder=""
    autofocus={false}
    {disabled}
    tabindex={-1}
    onkeydown={(e) => {
        if (e.key === "Enter") {
            handleSubmit();
            (e.target as HTMLElement).blur();
        }
    }}
/>
