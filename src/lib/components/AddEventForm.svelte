<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Plus } from "lucide-svelte";
    import * as Select from "$lib/components/ui/select";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";

    export let onSubmit: ((event: { title: string; tags: string[]; color: string }) => void) | undefined = undefined;

    let title = "";
    let tags = "";
    let color = "blue";
    let popoverOpen = false;

    const colors = [
        { value: "blue", label: "蓝色" },
        { value: "green", label: "绿色" },
        { value: "red", label: "红色" },
        { value: "yellow", label: "黄色" },
    ];

    function handleSubmit() {
        const eventData = {
            title,
            tags: tags.split(",").map((tag) => tag.trim()),
            color,
        };

        dispatch("submit", eventData);

        if (onSubmit) {
            onSubmit(eventData);
        }

        title = "";
        tags = "";
        color = "blue";
        popoverOpen = false;
    }

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function getColorLabel(value: string) {
        return colors.find(c => c.value === value)?.label ?? "选择颜色";
    }
</script>

<Popover.Root bind:open={popoverOpen}>
    <Popover.Trigger>
        <Button variant="outline">
            <Plus class="h-4 w-4 mr-2" />
            Add
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-80">
        <form class="grid gap-4" on:submit|preventDefault={handleSubmit}>
            <div class="grid gap-2">
                <Label for="title">标题</Label>
                <Input id="title" bind:value={title} placeholder="输入事件标题" />
            </div>

            <div class="grid gap-2">
                <Label for="tags">标签</Label>
                <Input id="tags" bind:value={tags} placeholder="输入标签，用逗号分隔" />
            </div>

            <div class="grid gap-2">
                <Label for="color">颜色</Label>
                <Select.Root type="single" bind:value={color}>
                    <Select.Trigger class="w-full">
                        {getColorLabel(color)}
                    </Select.Trigger>
                    <Select.Content>
                        {#each colors as colorOption}
                            <Select.Item value={colorOption.value}>
                                {colorOption.label}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <Button type="submit" class="w-full">提交</Button>
        </form>
    </Popover.Content>
</Popover.Root>
