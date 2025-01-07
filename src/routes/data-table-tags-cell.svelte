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
    $effect(() => {
        // console.log("localTags changed:", localTags);
        // onTagsChange(rowId, localTags);
    });
</script>

<div>
    <TagsAddButton bind:selectedTags={localTags} />
</div>
