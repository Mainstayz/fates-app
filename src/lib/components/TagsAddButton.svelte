<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Popover, PopoverTrigger, PopoverContent } from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus, PlusCircle } from "lucide-svelte";
    import { Separator } from "$lib/components/ui/separator";
    import { Input } from "$lib/components/ui/input";
    import { onMount } from "svelte";

    let { title = "添加标签", max = 2 }: { title?: string; max?: number } = $props();
    let open = $state(false);
    let tags = $state<string[]>([]);

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
            <Input placeholder="输入标签" />
        </div>
    </PopoverContent>
</Popover>

<style>
</style>
