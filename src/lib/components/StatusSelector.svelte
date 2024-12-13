<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Archive, Pause, Play } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import { TaskStatus } from "$lib/types";

    const dispatch = createEventDispatcher();

    export let status: TaskStatus;
    export let variant: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | undefined;

    const STATUS_CONFIGS = [
        { value: "激活" as TaskStatus, label: "激活", icon: Play },
        { value: "停止" as TaskStatus, label: "停止", icon: Pause },
        { value: "归档" as TaskStatus, label: "归档", icon: Archive },
    ];

    let open = false;

    function getStatusLabel(value: TaskStatus) {
        return STATUS_CONFIGS.find((c) => c.value === value)?.label ?? "选择状态";
    }

    function getStatusIcon(value: TaskStatus) {
        const config = STATUS_CONFIGS.find((c) => c.value === value);
        console.log("Current status:", value, "Found config:", config); // 调试日志
        return config?.icon ?? Play;
    }

    function handleStatusChange(newStatus: TaskStatus) {
        status = newStatus;
        dispatch("change", { status: newStatus });
        open = false;
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        <Button {variant} class="h-[32px] justify-start shadow-none {$$props.class}" onclick={() => (open = true)}>
            <div class="flex items-center gap-2">
                {#if status}
                    <svelte:component this={getStatusIcon(status)} class="w-4 h-4" />
                {/if}
                {getStatusLabel(status)}
            </div>
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[160px] p-0">
        <div class="flex flex-col">
            {#each STATUS_CONFIGS as statusOption}
                <Button
                    variant="ghost"
                    class="w-full justify-start"
                    onclick={() => handleStatusChange(statusOption.value)}
                >
                    <div class="flex items-center gap-2">
                        <svelte:component this={statusOption.icon} class="w-4 h-4" />
                        {statusOption.label}
                    </div>
                </Button>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
