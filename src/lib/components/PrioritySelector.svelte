<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Circle, Bookmark, Flame } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import { Priority } from "$lib/types";

    const dispatch = createEventDispatcher();

    export let priority: Priority;
    export let variant: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | undefined;

    const COLOR_MAP = {
        [Priority.Low]: "text-green-500",
        [Priority.Medium]: "text-blue-500",
        [Priority.High]: "text-red-500",
    };
    const PRIORITY_COLORS = [
        { value: Priority.Low, label: "低优先级" },
        { value: Priority.Medium, label: "中优先级" },
        { value: Priority.High, label: "高优先级" },
    ];

    let open = false;

    function getPriorityLabel(value: any) {
        return PRIORITY_COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    function handlePriorityChange(newPriority: any) {
        priority = newPriority;
        dispatch("change", { priority: newPriority });
        open = false;
    }

    function getIconComponent(priority: Priority | undefined) {
        switch (priority) {
            case Priority.High:
                return Flame;
            case Priority.Medium:
                return Bookmark;
            case Priority.Low:
            default:
                return Circle;
        }
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        <Button {variant} class="h-[32px] justify-start shadow-none {$$props.class}" onclick={() => (open = true)}>
            <div class="flex items-center gap-2">
                <svelte:component this={getIconComponent(priority)} class={`w-4 h-4 ${COLOR_MAP[priority]}`} />
                {getPriorityLabel(priority)}
            </div>
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[160px] p-0">
        <div class="flex flex-col">
            {#each PRIORITY_COLORS as priorityOption}
                <Button
                    variant="ghost"
                    class="w-full justify-start"
                    onclick={() => handlePriorityChange(priorityOption.value)}
                >
                    <svelte:component
                        this={getIconComponent(priorityOption.value)}
                        class={`w-4 h-4 ${COLOR_MAP[priorityOption.value]}`}
                    />
                    {priorityOption.label}
                </Button>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
