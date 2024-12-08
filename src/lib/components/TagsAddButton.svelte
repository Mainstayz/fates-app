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
    import { onMount } from "svelte";
    import Checkbox from "./ui/checkbox/checkbox.svelte";

    let { title = "添加标签", maxSelected = 2 }: { title?: string; maxSelected?: number } = $props();
    let open = $state(false);
    let tags = $state<string[]>([]);
    let tagsList = $state<string[]>(["标签1", "标签2", "标签3", "标签4", "标签5"]);
    let showCreateNewTag = $state(false);

    function addTag(tag: string) {
        tags = [...tags, tag];
    }

    onMount(() => {
        addTag("标签1");
        addTag("标签2");
    });
</script>

<Popover bind:open>
    <PopoverTrigger>
        <Button variant="outline" size="sm" class="h-8 border-dashed">
            {#if tags.length > 0}
                <div class="hidden space-x-1 lg:flex">
                    {#each tags as tag}
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
                <CommandInput placeholder="输入标签" />
                <CommandList>
                    <CommandEmpty>没有找到标签</CommandEmpty>
                    <CommandGroup>
                        {#each tagsList.slice(0, 3) as tag}
                            <CommandItem value={tag} onSelect={() => addTag(tag)}>
                                <!-- 如果标签在tags中，则显示勾选图标 -->
                                <div
                                    class={cn(
                                        "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                        tags.includes(tag)
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}
                                >
                                    <Check class={cn("h-4 w-4")} />
                                </div>
                                <span>{tag}</span>
                            </CommandItem>
                        {/each}
                        {#if tagsList.length > 3}
                            <CommandItem disabled>
                                <span> 更多标签被隐藏({tagsList.length - 3}) </span>
                            </CommandItem>
                        {/if}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                        <!-- Create new tag -->
                        {#if !showCreateNewTag}
                            <CommandItem class="justify-center text-center" onSelect={() => (showCreateNewTag = true)}>
                                <span>创建新标签</span>
                            </CommandItem>
                        {:else}
                            <!-- Create new tag input -->
                            <div class="flex flex-row gap-2 h-[32px]">
                                <Input
                                    autofocus
                                    type="text"
                                    placeholder="输入新标签"
                                    class="border-0 shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[32px]"
                                />
                                <!-- cancel button -->
                                <Button variant="ghost" size="icon" onclick={() => (showCreateNewTag = false)}>
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        {/if}
                        {#if tags.length > 0}
                            <CommandItem
                                class="justify-center text-center"
                                onSelect={() => {
                                    tags = [];
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
