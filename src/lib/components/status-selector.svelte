<script lang="ts">
    import * as Popover from "$lib/components/ui/popover";
    import { Button } from "$lib/components/ui/button";
    import { Archive, Pause, Play } from "lucide-svelte";
    import { TaskStatus } from "$lib/types";
    import { t } from "svelte-i18n";

    export let status: number;
    export let variant: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | undefined = "outline";
    export let onStatusValueChange: (status: number) => void;

    const STATUS_CONFIGS = [
        { value: TaskStatus.Active, label: $t("app.status.active"), icon: Play },
        { value: TaskStatus.Stopped, label: $t("app.status.stopped"), icon: Pause },
        { value: TaskStatus.Archived, label: $t("app.status.archived"), icon: Archive },
    ];

    let open = false;

    function getStatusLabel(value: TaskStatus) {
        return STATUS_CONFIGS.find((c) => c.value === value)?.label ?? $t("app.status.select");
    }

    function getStatusIcon(value: TaskStatus) {
        const config = STATUS_CONFIGS.find((c) => c.value === value);
        return config?.icon ?? Play;
    }

    function handleStatusChange(newStatus: TaskStatus) {
        status = newStatus;
        if (typeof onStatusValueChange === "function") {
            onStatusValueChange(newStatus);
        } else {
            console.error("onStatusChange is not a function");
        }
        open = false;
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        <Button {variant} class="h-[32px] justify-start shadow-none {$$props.class}" onclick={() => (open = true)}>
            <div class="flex items-center gap-2">
                {#if status != null}
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
