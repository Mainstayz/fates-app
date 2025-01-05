<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Circle, Bookmark, Flame } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import { Priority } from "$lib/types";
    import { t } from "svelte-i18n";
    import { cn } from "$lib/utils.js";

    const dispatch = createEventDispatcher();

    let {
        priority,
        variant,
        class: className = "",
    }: {
        priority: Priority;
        variant: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | undefined;
        class: string;
    } = $props();

    const COLOR_MAP = {
        [Priority.Low]: "text-green-500",
        [Priority.Medium]: "text-blue-500",
        [Priority.High]: "text-red-500",
    };
    const PRIORITY_COLORS = [
        { value: Priority.Low, label: $t("app.repeat.priority.low") },
        { value: Priority.Medium, label: $t("app.repeat.priority.medium") },
        { value: Priority.High, label: $t("app.repeat.priority.high") },
    ];

    let myOpen = $state(false);
    $inspect(myOpen);

    function getPriorityLabel(value: any) {
        return PRIORITY_COLORS.find((c) => c.value === value)?.label ?? $t("app.repeat.priority.select");
    }

    function handlePriorityChange(newPriority: any) {
        priority = newPriority;
        dispatch("change", { priority: newPriority });
        myOpen = false;
    }
</script>

<Popover.Root bind:open={myOpen}>
    <Popover.Trigger>
        <Button {variant} class={cn("h-[32px] justify-start shadow-none", className)}>
            <div class="flex items-center gap-2">
                {#if priority === Priority.High}
                    <Flame class={`w-4 h-4 ${COLOR_MAP[priority]}`} />
                {:else if priority === Priority.Medium}
                    <Bookmark class={`w-4 h-4 ${COLOR_MAP[priority]}`} />
                {:else}
                    <Circle class={`w-4 h-4 ${COLOR_MAP[priority]}`} />
                {/if}
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
                    {#if priorityOption.value === Priority.High}
                        <Flame class={`w-4 h-4 ${COLOR_MAP[priorityOption.value]}`} />
                    {:else if priorityOption.value === Priority.Medium}
                        <Bookmark class={`w-4 h-4 ${COLOR_MAP[priorityOption.value]}`} />
                    {:else}
                        <Circle class={`w-4 h-4 ${COLOR_MAP[priorityOption.value]}`} />
                    {/if}
                    {priorityOption.label}
                </Button>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
