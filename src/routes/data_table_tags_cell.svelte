<script lang="ts">
    // 未支持 svelte 5
    import { DataColumn, BodyRow } from "svelte-headless-table";
    import TagsAddButton from "$lib/components/TagsAddButton.svelte";
    // https://svelte.dev/playground/44e2a26454ad478aa27e92b89e82e680?version=3.49.0

    export let row: BodyRow<any>;
    export let column: DataColumn<any>;

    export let allTags: string[];
    export let selectedTags: string[];

    export let onTagsChange: (row: string, col: string, allTags: string[], selectedTags: string[]) => void;

    let localAllTags = [...allTags];
    let localTags = [...selectedTags];

    // 改为使用事件处理函数，只在用户操作时触发
    const handleTagsChange = () => {
        if (row.isData()) {
            onTagsChange(row.dataId, column.id, localAllTags, localTags);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    };
</script>

<div>
    <TagsAddButton bind:tagsList={localAllTags} bind:selectedTags={localTags} on:tagsChange={handleTagsChange} />
</div>
