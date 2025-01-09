<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import { Command, CommandGroup, CommandItem, CommandList } from "$lib/components/ui/command";
    import { Input } from "$lib/components/ui/input";
    import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
    import { Separator } from "$lib/components/ui/separator";
    import { cn } from "$lib/utils";
    import { Check, PlusCircle, Trash2, X } from "lucide-svelte";
    import { t } from "svelte-i18n";

    import tagManager from "$src/tag-manager.svelte";

    const MAX_TAGS_COUNT = 5;
    const maxSelectedTags: number = 2;

    let { selectedTags, callback }: { selectedTags: string[]; callback: (tags: string[]) => void } = $props();

    let openStatus = $state(false);
    let showCreateNewTag = $state(false);

    let newTagName = $state("");
    let searchKeyword = $state("");

    if (selectedTags.length > 0) {
        let newTags = selectedTags.filter((tag) => !tagManager.tagNames.includes(tag));
        if (newTags.length > 0) {
            tagManager.createTags(newTags).then(() => {
                tagManager.fetchAllTags();
            });
        }
    }

    let localSelectedTags = $state([...selectedTags]);

    let allTags = $derived([
        ...localSelectedTags,
        ...tagManager.tagNames.filter((tag) => !localSelectedTags.includes(tag)),
    ]);
    let filteredTags = $state<string[]>([]);

    $effect(() => {
        if (searchKeyword.length > 0) {
            filteredTags = allTags.filter((tag) => tag.includes(searchKeyword));
        } else {
            filteredTags = allTags;
        }
        callback(localSelectedTags);
    });

    $inspect("[TagsAddButton] Local selected tags:", localSelectedTags);
    $inspect("[TagsAddButton] All tags:", allTags);

    function selectTag(tag: string) {
        if (localSelectedTags.includes(tag)) {
            return;
        }
        console.log("selectTag:", tag);
        localSelectedTags.push(tag);
        tagManager.updateTagsLastUsedAt(localSelectedTags);
    }

    function unSelectTag(tag: string) {
        const index = localSelectedTags.indexOf(tag);
        if (index !== -1) {
            console.log("unSelectTag:", tag);
            localSelectedTags.splice(index, 1);
        }
    }

    function toggleTag(tag: string) {
        if (localSelectedTags.includes(tag)) {
            unSelectTag(tag);
        } else {
            selectTag(tag);
        }
    }

    function handleNewTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && newTagName.trim()) {
            handleCreateNewTag(newTagName.trim());
            newTagName = "";
            showCreateNewTag = false;
        }
    }

    function handleCreateNewTag(tag: string) {
        if (allTags.includes(tag)) {
            console.log(`[TagsAddButton] Tag ${tag} already exists`);
            return;
        }
        tagManager
            .createTags([tag])
            .then(() => {
                return tagManager.fetchAllTags();
            })
            .then(() => {
                if (localSelectedTags.length < maxSelectedTags) {
                    console.log(`[TagsAddButton] Add new tag: ${tag}`);
                    localSelectedTags.push(tag);
                }
            });
    }

    function handleDeleteTag(tag: string) {
        unSelectTag(tag);
        tagManager.deleteTags([tag]).then(() => {
            tagManager.fetchAllTags();
        });
    }

    function clearTags() {
        localSelectedTags = [];
    }
</script>

<Popover bind:open={openStatus}>
    <PopoverTrigger>
        <Button variant="outline" size="sm" class="h-8 border-dashed">
            {#if localSelectedTags.length > 0}
                <div class="flex flex-row gap-1 items-center">
                    {#each localSelectedTags.slice(0, MAX_TAGS_COUNT) as tag}
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
            <Command>
                {#if filteredTags.length > 0}
                    {#if filteredTags.length > MAX_TAGS_COUNT}
                        <Input
                            placeholder={$t("app.tags.searchTags")}
                            class="bg-background border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                            bind:value={searchKeyword}
                        />
                    {/if}
                    <CommandList>
                        {#if filteredTags.length === 0}
                            <div class="py-1 text-center text-sm">{$t("app.tags.noTags")}</div>
                        {/if}
                        <CommandGroup>
                            {#each filteredTags.slice(0, MAX_TAGS_COUNT) as tag}
                                <div class="flex flex-row justify-between items-center">
                                    <CommandItem
                                        value={tag}
                                        onSelect={() => toggleTag(tag)}
                                        disabled={selectedTags.length >= maxSelectedTags && !selectedTags.includes(tag)}
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
                        {#if filteredTags.length > MAX_TAGS_COUNT}
                            <CommandGroup>
                                <CommandItem disabled>
                                    <span
                                        >{$t("app.tags.moreTagsHidden", {
                                            values: { count: filteredTags.length - MAX_TAGS_COUNT },
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
                                bind:value={newTagName}
                                onkeydown={handleNewTagKeydown}
                                class="bg-background border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[32px]"
                            />
                            {#if newTagName.length > 0}
                                <Button variant="ghost" size="icon" onclick={() => (showCreateNewTag = false)}>
                                    <X class="h-4 w-4" />
                                </Button>
                            {/if}
                        </div>
                    {/if}
                    {#if localSelectedTags.length > 0}
                        <CommandItem onSelect={clearTags}>{$t("app.tags.clearTags")}</CommandItem>
                    {/if}
                </CommandGroup>
            </Command>
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
