<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Popover, PopoverTrigger, PopoverContent } from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Check, Plus, PlusCircle } from "lucide-svelte";
    import { Separator } from "$lib/components/ui/separator";
    import { Input } from "$lib/components/ui/input";
    import { cn } from "$lib/utils";
    import { X } from "lucide-svelte";
    import { onMount } from "svelte";
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

    let {
        tagsList: initialTagsList,
        selectedTags: initialSelectedTags,
        onAddNewTag,
        onUseTag,
    }: {
        tagsList: string[];
        selectedTags: string[];
        onAddNewTag: (tag: string[]) => void;
        onUseTag: (tag: string[]) => void;
    } = $props();

    let localTagsList = $state([...initialTagsList]);
    let localSelectedTags = $state([...initialSelectedTags]);

    let origianlTagsList = [...initialTagsList];

    let firstOpen = $state(false);
    let open = $state(false);
    let showCreateNewTag = $state(false);
    let newTag = $state("");
    let shouldTriggerCallback = $state(false);

    $effect(() => {
        if (shouldTriggerCallback) {
            const newTags = localTagsList.filter((tag) => !origianlTagsList.includes(tag));
            if (newTags.length > 0) {
                onAddNewTag(newTags);
            }
            if (localSelectedTags.length > 0) {
                onUseTag(localSelectedTags);
            }
            shouldTriggerCallback = false;
        }
    });

    $effect(() => {
        if (open === false && firstOpen) {
            shouldTriggerCallback = true;
        } else if (!firstOpen && open) {
            firstOpen = true;
        }
    });

    onMount(() => {});

    function addTag(tag: string) {
        if (localSelectedTags.includes(tag)) {
            return;
        }
        localSelectedTags = [...localSelectedTags, tag];
    }

    function removeTag(tag: string) {
        localSelectedTags = localSelectedTags.filter((t) => t !== tag);
    }

    function toggleTag(tag: string) {
        if (localSelectedTags.includes(tag)) {
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
        localSelectedTags = [tag, ...localSelectedTags];
        localTagsList = [tag, ...localTagsList];
    }

    function clearTags() {
        localSelectedTags = [];
    }
</script>

<Popover bind:open>
    <PopoverTrigger>
        <Button variant="outline" size="sm" class="h-8 border-dashed">
            {#if localSelectedTags.length > 0}
                <div class="hidden space-x-1 lg:flex">
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
                <CommandInput placeholder="输入标签" class="bg-background" />
                <CommandList>
                    <CommandEmpty>没有找到标签</CommandEmpty>
                    <CommandGroup>
                        {#each localTagsList.slice(0, MAX_TAGS_COUNT) as tag}
                            <CommandItem value={tag} onSelect={() => toggleTag(tag)}>
                                <div
                                    class={cn(
                                        "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                        localSelectedTags.includes(tag)
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}
                                >
                                    <Check class={cn("h-4 w-4")} />
                                </div>
                                <span>{tag}</span>
                            </CommandItem>
                        {/each}
                        {#if localTagsList.length > MAX_TAGS_COUNT}
                            <CommandItem disabled>
                                <span> 更多标签被隐藏 ({localTagsList.length - MAX_TAGS_COUNT}) </span>
                            </CommandItem>
                        {/if}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                        <!-- Create new tag -->
                        {#if !showCreateNewTag}
                            <CommandItem onSelect={() => (showCreateNewTag = true)}>
                                <span>创建新标签</span>
                            </CommandItem>
                        {:else}
                            <!-- Create new tag input -->
                            <div class="flex flex-row gap-2 h-[32px]">
                                <Input
                                    autofocus
                                    type="text"
                                    placeholder="输入新标签"
                                    bind:value={newTag}
                                    onkeydown={handleNewTagKeydown}
                                    class="bg-background border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[32px]"
                                />
                                <!-- cancel button -->
                                <Button variant="ghost" size="icon" onclick={() => (showCreateNewTag = false)}>
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        {/if}
                        {#if localSelectedTags.length > 0}
                            <CommandItem onSelect={clearTags}>清空标签</CommandItem>
                        {/if}
                    </CommandGroup>
                </CommandList>
            </Command>
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
