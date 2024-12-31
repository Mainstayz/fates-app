<script lang="ts">
    import TagsAddButton from "$lib/components/tags-add-button.svelte";

    export let rowId: string;
    export let allTags: string[];
    export let selectedTags: string[];

    export let onTagsChange: (rowId: string, allTags: string[], selectedTags: string[]) => void;

    let localTags = [...selectedTags];
    let localAllTags = [...allTags];
    // 改为使用事件处理函数，只在用户操作时触发
    const handleTagsChange = (tagsList: string[], selectedTags: string[]) => {
        onTagsChange(rowId, tagsList, selectedTags);
    };
</script>

<div>
    <TagsAddButton tagsList={localAllTags} selectedTags={localTags} onTagsChange={handleTagsChange} />
</div>
