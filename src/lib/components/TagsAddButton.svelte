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
        tagsList,
        selectedTags,
        onAddNewTag,
        onUseTag,
    }: {
        tagsList: string[];
        selectedTags: string[];
        onAddNewTag: (tag: string[]) => void;
        onUseTag: (tag: string[]) => void;
    } = $props();

    let origianlTagsList: string[] = [];
    // 将 tagsList 添加到 origianlTagsList
    for (let tag of tagsList) {
        origianlTagsList.push(tag);
    }

    let firstOpen = $state(false);
    let open = $state(false);
    let showCreateNewTag = $state(false);
    let newTag = $state("");

    $effect(() => {
        if (firstOpen === false && open === true) {
            firstOpen = true;
        }
        if (firstOpen && open === false) {
            let diffTags = tagsList.filter((tag) => !origianlTagsList.includes(tag));
            if (diffTags.length > 0) {
                onAddNewTag(diffTags);
            }
            if (selectedTags.length > 0) {
                onUseTag(selectedTags);
            }
        }
    });

    onMount(() => {});

    function addTag(tag: string) {
        selectedTags.push(tag);
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
                <CommandInput placeholder="输入标签" class="bg-background" />
                <CommandList>
                    <CommandEmpty>没有找到标签</CommandEmpty>
                    <CommandGroup>
                        {#each tagsList.slice(0, MAX_TAGS_COUNT) as tag}
                            <CommandItem value={tag} onSelect={() => addTag(tag)}>
                                <!-- 如果标签在 tags 中，则显示勾选图标 -->
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
                                <span> 更多标签被隐藏 ({tagsList.length - MAX_TAGS_COUNT}) </span>
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
                                    onkeydown={(e) => {
                                        if (e.key === "Enter") {
                                            // 插入第一位
                                            selectedTags.unshift(newTag);
                                            tagsList.unshift(newTag);
                                            newTag = "";
                                            showCreateNewTag = false;
                                        }
                                    }}
                                    class="bg-background border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[32px]"
                                />
                                <!-- cancel button -->
                                <Button variant="ghost" size="icon" onclick={() => (showCreateNewTag = false)}>
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        {/if}
                        {#if selectedTags.length > 0}
                            <CommandItem
                                onSelect={() => {
                                    // 清空 selectedTags
                                    selectedTags.length = 0;
                                }}
                            >
                                清空标签
                            </CommandItem>
                        {/if}
                    </CommandGroup>
                </CommandList>
            </Command>
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
