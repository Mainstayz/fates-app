<script lang="ts">
    // 未支持 svelte 5
    import { DataColumn, BodyRow } from "svelte-headless-table";
    import TagsAddButton from "$lib/components/TagsAddButton.svelte";
    // https://svelte.dev/playground/44e2a26454ad478aa27e92b89e82e680?version=3.49.0

    export let row: BodyRow<any>;
    export let column: DataColumn<any>;

    // 标签
    export let allTags: string[];
    export let selectedTags: string[];

    console.log(`!!!第三步 ==>  ROW: ${row.id}  selectedTags: ${selectedTags} allTags: ${allTags} `);

    export let onTagsChange: (row: string, col: string, allTags: string[], selectedTags: string[]) => void;

    let localTags = [...selectedTags];
    let localAllTags = [...allTags];

    // 改为使用事件处理函数，只在用户操作时触发
    const handleTagsChange = (tagsList: string[], selectedTags: string[]) => {
        if (row.isData()) {
            onTagsChange(row.dataId, column.id, tagsList, selectedTags);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    };
</script>

<div>
    <TagsAddButton tagsList={localAllTags} selectedTags={localTags} onTagsChange={handleTagsChange} />
</div>
