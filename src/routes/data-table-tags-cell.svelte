<script lang="ts">
    import TagsAddButton from "$lib/components/tags-add-button.svelte";
    let {
        rowId,
        selectedTags,
        onTagsChange,
    }: { rowId: string; selectedTags: string[]; onTagsChange: (rowId: string, selectedTags: string[]) => void } =
        $props();

    let localTags = $state([...selectedTags]);
    // 改为使用事件处理函数，只在用户操作时触发
    function handleTagsChange(newTags: string[]) {
        // 判断 newTags 是否与 localTags 相同，如果相同则不更新
        if (newTags.length === localTags.length && newTags.every((tag) => localTags.includes(tag))) {
            return;
        }
        localTags = newTags;
        console.log("handleTagsChange:", newTags);
        onTagsChange(rowId, localTags);
    }
</script>

<div>
    <TagsAddButton selectedTags={localTags} callback={handleTagsChange} />
</div>
