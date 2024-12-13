<script lang="ts">
    // 未支持 svelte 5
    import { DataColumn } from "svelte-headless-table";
    // https://svelte-headless-table.bryanmylee.com/docs/api/body-row
    export let row; /*: BodyRow<Item>*/
    export let column; /*: DataColumn<Item>*/
    export let value; /*: unknown;*/
    export let onUpdateValue; /*: (rowDataId: string, columnId: string, newValue: unknown) => void*/

    let isEditing = false;
    let inputElement: HTMLInputElement | undefined;

    $: if (isEditing) {
        inputElement?.focus();
    }
    const handleCancel = () => {
        isEditing = false;
    };

    const handleSubmit = () => {
        isEditing = false;
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, value);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    };
</script>
