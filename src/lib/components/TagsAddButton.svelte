<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Popover, PopoverTrigger, PopoverContent } from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Check, Plus, PlusCircle } from "lucide-svelte";
    import { Separator } from "$lib/components/ui/separator";
    import { Input } from "$lib/components/ui/input";
    import { cn } from "$lib/utils";
    import { X } from "lucide-svelte";
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
    const EMPTY_TAG_MESSAGE = "没有找到标签";
    const NEW_TAG_PLACEHOLDER = "新建标签";
    const CREATE_NEW_TAG_TEXT = "新建标签";
    const CLEAR_TAGS_TEXT = "清空标签";
    const MORE_TAGS_HIDDEN_TEXT = (count: number) => `更多标签被隐藏 (${count})`;
    const INPUT_TAG_PLACEHOLDER = "搜索标签";

    export let tagsList: string[] = [];
    export let selectedTags: string[] = [];

    let open = false;
    let showCreateNewTag = false;
    let newTag = "";

    $: if (tagsList.length === 0) {
        showCreateNewTag = true;
    }

    function addTag(tag: string) {
        if (selectedTags.includes(tag)) {
            return;
        }
        selectedTags = [...selectedTags];
        selectedTags.unshift(tag);
    }

    function removeTag(tag: string) {
        const index = selectedTags.indexOf(tag);
        if (index !== -1) {
            selectedTags = [...selectedTags];
            selectedTags.splice(index, 1);
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
        selectedTags = [...selectedTags];
        tagsList = [...tagsList];

        selectedTags.unshift(tag);
        tagsList.unshift(tag);
    }

    function clearTags() {
        selectedTags = [];
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
            <Command>
                {#if tagsList.length > 0}
                    {#if tagsList.length > MAX_TAGS_COUNT}
                        <CommandInput placeholder={INPUT_TAG_PLACEHOLDER} class="bg-background" />
                    {/if}
                    <CommandList>
                        <CommandEmpty>{EMPTY_TAG_MESSAGE}</CommandEmpty>
                        <CommandGroup>
                            {#each tagsList.slice(0, MAX_TAGS_COUNT) as tag}
                                <CommandItem value={tag} onSelect={() => toggleTag(tag)}>
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
                            {/each}
                            {#if tagsList.length > MAX_TAGS_COUNT}
                                <CommandItem disabled>
                                    <span>{MORE_TAGS_HIDDEN_TEXT(tagsList.length - MAX_TAGS_COUNT)}</span>
                                </CommandItem>
                            {/if}
                        </CommandGroup>
                        <CommandSeparator />
                    </CommandList>
                {/if}
                <CommandGroup>
                    {#if !showCreateNewTag}
                        <CommandItem onSelect={() => (showCreateNewTag = true)}>
                            <span>{CREATE_NEW_TAG_TEXT}</span>
                        </CommandItem>
                    {:else}
                        <div class="flex flex-row gap-2 h-[32px]">
                            <Input
                                autofocus
                                type="text"
                                placeholder={NEW_TAG_PLACEHOLDER}
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
                        <CommandItem onSelect={clearTags}>{CLEAR_TAGS_TEXT}</CommandItem>
                    {/if}
                </CommandGroup>
            </Command>
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
