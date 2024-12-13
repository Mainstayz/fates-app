<script>
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Leaf, Zap, Flame } from "lucide-svelte";

    export let priority;
    export let variant = "outline";

    const Priority = {
        Low: -1,
        Medium: 0,
        High: 1,
    };

    const PRIORITY_COLORS = [
        { value: Priority.Low, label: "低优先级", icon: Leaf },
        { value: Priority.Medium, label: "中优先级", icon: Zap },
        { value: Priority.High, label: "高优先级", icon: Flame },
    ];

    let open = false;

    function getPriorityLabel(value) {
        return PRIORITY_COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        <Button {variant} class="h-[32px] justify-start shadow-none {$$props.class}" on:click={() => (open = true)}>
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
                    on:click={() => {
                        priority = priorityOption.value;
                        open = false;
                    }}
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
