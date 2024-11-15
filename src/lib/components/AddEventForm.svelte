<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Plus } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        submit: {
            title: string;
            startTime: Date;
            endTime: Date;
            tags: string[];
            color: string;
        };
    }>();

    // 表单数据
    let formData = {
        title: "",
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        tags: [] as string[],
        color: ["blue"]
    };

    // 当前输入的标签
    let currentTag = "";

    // 颜色选项
    const colorOptions = [
        { value: "blue", label: "Blue" },
        { value: "green", label: "Green" },
        { value: "yellow", label: "Yellow" },
        { value: "red", label: "Red" }
    ];

    // 处理标签添加
    function handleAddTag(e: KeyboardEvent) {
        if (e.key === 'Enter' && currentTag.trim()) {
            formData.tags = [...formData.tags, currentTag.trim()];
            currentTag = "";
        }
    }

    // 处理标签删除
    function removeTag(index: number) {
        formData.tags = formData.tags.filter((_, i) => i !== index);
    }

    // 处理表单提交
    function handleSubmit() {
        dispatch('submit', formData);
        // 重置表单
        formData = {
            title: "",
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            tags: [],
            color: ["blue"]
        };
    }
</script>

<Popover.Root>
    <Popover.Trigger asChild>
        <Button variant="outline">
            <Plus class="h-4 w-4 mr-2" />
            Add
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-80">
        <div class="grid gap-4">
            <div class="space-y-2">
                <h4 class="font-medium leading-none">Add New Event</h4>
                <p class="text-sm text-muted-foreground">
                    Create a new event in your timeline.
                </p>
            </div>
            <div class="grid gap-2">
                <div class="grid gap-1">
                    <Label for="title">Title</Label>
                    <Input id="title" bind:value={formData.title} />
                </div>

                <div class="grid gap-1">
                    <Label>Start Time</Label>
                    <Input
                        type="datetime-local"
                        bind:value={formData.startTime}
                    />
                </div>

                <div class="grid gap-1">
                    <Label>End Time</Label>
                    <Input
                        type="datetime-local"
                        bind:value={formData.endTime}
                    />
                </div>

                <div class="grid gap-1">
                    <Label>Tags</Label>
                    <div class="flex flex-wrap gap-1 mb-2">
                        {#each formData.tags as tag, index}
                            <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
                                {tag}
                                <button
                                    class="text-secondary-foreground/50 hover:text-secondary-foreground"
                                    on:click={() => removeTag(index)}
                                >
                                    ×
                                </button>
                            </span>
                        {/each}
                    </div>
                    <Input
                        placeholder="Type and press Enter to add tags"
                        bind:value={currentTag}
                        on:keydown={handleAddTag}
                    />
                </div>

                <div class="grid gap-1">
                    <Label>Color</Label>
                    <Select.Root bind:value={formData.color}>
                        <Select.Trigger>
                            <Select.Value placeholder="Select a color" />
                        </Select.Trigger>
                        <Select.Content>
                            {#each colorOptions as option}
                                <Select.Item value={option.value}>
                                    <div class="flex items-center gap-2">
                                        <div class="w-4 h-4 rounded-full" style="background-color: {option.value}" />
                                        {option.label}
                                    </div>
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>

                <Button class="w-full" onclick={handleSubmit}>
                    Create Event
                </Button>
            </div>
        </div>
    </Popover.Content>
</Popover.Root>
