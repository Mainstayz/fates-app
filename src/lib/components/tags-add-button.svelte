<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Popover, PopoverTrigger, PopoverContent } from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Check, Plus, PlusCircle, X, Trash2 } from "lucide-svelte";
    import { Separator } from "$lib/components/ui/separator";
    import { Input } from "$lib/components/ui/input";
    import { cn } from "$lib/utils";
    import { t } from "svelte-i18n";
    import {
        Command,
        CommandInput,
        CommandList,
        CommandEmpty,
        CommandGroup,
        CommandItem,
        CommandSeparator,
    } from "$lib/components/ui/command";

    const MAX_TAGS_COUNT = 5;
    const maxSelectedTags: number = 2;

    export let selectedTags: string[] = [];
    export let tagsList: string[] = [];
    export let onTagsChange: (tagsList: string[], selectedTags: string[], deleteTag: string[]) => void;

    tagsList = [...new Set([...selectedTags, ...tagsList])];

    let open = false;
    let showCreateNewTag = false;
    let newTag = "";
    let selectedTagsCount = 0;
    let searchKeyword = "";
    let deleteTag: string[] = [];

    $: showCreateNewTag = tagsList.length === 0;
    $: selectedTagsCount = selectedTags.length;
    $: {
        if (searchKeyword == "") {
            tagsList = [...new Set([...selectedTags, ...tagsList])];
        }
    }

    function customFilter(value: string, search: string, keywords?: string[]): number {
        return value.includes(search) ? 1 : 0;
    }

    function addTag(tag: string) {
        if (selectedTags.includes(tag)) {
            return;
        }
        selectedTags = [...selectedTags, tag];
        handleTagChange();
    }

    function removeTag(tag: string) {
        const index = selectedTags.indexOf(tag);
        if (index !== -1) {
            selectedTags = [...selectedTags];
            selectedTags.splice(index, 1);
            handleTagChange();
        }
    }

    function toggleTag(tag: string) {
        if (selectedTags.includes(tag)) {
            removeTag(tag);
        } else {
            addTag(tag);
        }
    }

    function handleNewTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && newTag.trim()) {
            handleCreateNewTag(newTag.trim());
            newTag = "";
            showCreateNewTag = false;
        }
    }

    function handleCreateNewTag(tag: string) {
        if (selectedTagsCount < maxSelectedTags) {
            selectedTags = [...selectedTags, tag];
            const excludeSelectedTags = tagsList.filter((t) => !selectedTags.includes(t));
            tagsList = [...new Set([...selectedTags, ...excludeSelectedTags])];
        } else {
            const excludeSelectedTags = tagsList.filter((t) => !selectedTags.includes(t));
            tagsList = [...new Set([...selectedTags, tag, ...excludeSelectedTags])];
        }
        handleTagChange();
    }

    function handleDeleteTag(tag: string) {
        deleteTag = [...deleteTag, tag];
        tagsList = tagsList.filter((t) => t !== tag);
        selectedTags = selectedTags.filter((t) => t !== tag);
        handleTagChange();
    }

    function clearTags() {
        selectedTags = [];
        handleTagChange();
    }

    function handleTagChange() {
        console.log(`tagsList: ${tagsList} selectedTags: ${selectedTags} deleteTag: ${deleteTag}`);
        onTagsChange(tagsList, selectedTags, deleteTag);
        deleteTag = [];
    }
</script>

<Popover bind:open>
    <PopoverTrigger>
        <Button variant="outline" size="sm" class="h-8 border-dashed">
            {#if selectedTags.length > 0}
                <div class="hidden space-x-1 lg:flex">
                    {#each selectedTags.slice(0, MAX_TAGS_COUNT) as tag}
                        <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                            {tag}
                        </Badge>
                    {/each}
                </div>
                <Separator orientation="vertical" class="mx-2 h-4" />
            {/if}
            <PlusCircle size={16} />
        </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[200px] p-0" align="start" side="bottom">
        <div class="p-3">
            <Command filter={customFilter}>
                {#if tagsList.length > 0}
                    {#if tagsList.length > MAX_TAGS_COUNT}
                        <CommandInput
                            placeholder={$t("app.tags.searchTags")}
                            class="bg-background"
                            bind:value={searchKeyword}
                        />
                    {/if}
                    <CommandList>
                        <CommandEmpty>{$t("app.tags.noTags")}</CommandEmpty>
                        <CommandGroup>
                            {#each tagsList
                                .filter((tag) => tag.toLowerCase().includes(searchKeyword.toLowerCase()))
                                .slice(0, MAX_TAGS_COUNT) as tag}
                                <div class="flex flex-row justify-between items-center">
                                    <CommandItem
                                        value={tag}
                                        onSelect={() => toggleTag(tag)}
                                        disabled={selectedTagsCount >= maxSelectedTags && !selectedTags.includes(tag)}
                                    >
                                        <div
                                            class={cn(
                                                "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                                selectedTags.includes(tag)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check class={cn("h-4 w-4")} />
                                        </div>
                                        <span>{tag}</span>
                                    </CommandItem>
                                    <Button class="p-2" variant="ghost" onclick={() => handleDeleteTag(tag)}>
                                        <Trash2 class="w-4 h-4" />
                                    </Button>
                                </div>
                            {/each}
                        </CommandGroup>
                        {#if tagsList.length > MAX_TAGS_COUNT}
                            <CommandGroup>
                                <CommandItem disabled>
                                    <span
                                        >{$t("app.tags.moreTagsHidden", {
                                            values: { count: tagsList.length - MAX_TAGS_COUNT },
                                        })}</span
                                    >
                                </CommandItem>
                            </CommandGroup>
                        {/if}
                    </CommandList>
                {/if}
                <CommandGroup>
                    {#if !showCreateNewTag}
                        <CommandItem onSelect={() => (showCreateNewTag = true)}>
                            <span>{$t("app.tags.createNewTag")}</span>
                        </CommandItem>
                    {:else}
                        <div class="flex flex-row gap-2 h-[32px]">
                            <Input
                                autofocus
                                type="text"
                                placeholder={$t("app.tags.newTagPlaceholder")}
                                bind:value={newTag}
                                onkeydown={handleNewTagKeydown}
                                class="bg-background border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[32px]"
                            />
                            {#if tagsList.length > 0}
                                <Button variant="ghost" size="icon" onclick={() => (showCreateNewTag = false)}>
                                    <X class="h-4 w-4" />
                                </Button>
                            {/if}
                        </div>
                    {/if}
                    {#if selectedTags.length > 0}
                        <CommandItem onSelect={clearTags}>{$t("app.tags.clearTags")}</CommandItem>
                    {/if}
                </CommandGroup>
            </Command>
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
