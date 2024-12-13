<script lang="ts">
    import { DataColumn, BodyRow } from "svelte-headless-table";
    import { Input } from "$lib/components/ui/input";

    export let row: BodyRow<any>;
    export let column: DataColumn<any>;
    export let value: string;
    export let onUpdateValue: (rowDataId: string, columnId: string, newValue: unknown) => void;

    const handleSubmit = () => {
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, value);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    };
</script>

<Input
    type="text"
    class="bg-background border-0 shadow-none h-[24px]"
    bind:value
    placeholder=""
    autofocus={false}
    tabindex={-1}
    onkeydown={(e) => {
        if (e.key === "Enter") {
            handleSubmit();
            // 移除焦点
            (e.target as HTMLElement).blur();
        }
    }}
/>
