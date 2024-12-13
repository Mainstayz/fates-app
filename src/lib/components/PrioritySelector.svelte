<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Leaf, Zap, Flame } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import { Priority } from "$lib/types";

    const dispatch = createEventDispatcher();

    export let priority: Priority;
    export let variant: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | undefined;

    const PRIORITY_COLORS = [
        { value: Priority.Low, label: "低优先级", icon: Leaf },
        { value: Priority.Medium, label: "中优先级", icon: Zap },
        { value: Priority.High, label: "高优先级", icon: Flame },
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
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        <Button {variant} class="h-[32px] justify-start shadow-none {$$props.class}" onclick={() => (open = true)}>
            <div class="flex items-center gap-2">
                {#if priority !== undefined}
                    {@const Icon = PRIORITY_COLORS.find((c) => c.value === priority)?.icon}
                    <Icon
                        class={`w-4 h-4 ${
                            priority === Priority.High
                                ? "text-red-500"
                                : priority === Priority.Medium
                                  ? "text-yellow-500"
                                  : "text-green-500"
                        }`}
                    />
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
                    {@const Icon = priorityOption.icon}
                    <div class="flex items-center gap-2">
                        <Icon
                            class={`w-4 h-4 ${
                                priorityOption.value === Priority.High
                                    ? "text-red-500"
                                    : priorityOption.value === Priority.Medium
                                      ? "text-yellow-500"
                                      : "text-green-500"
                            }`}
                        />
                        {priorityOption.label}
                    </div>
                </Button>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
