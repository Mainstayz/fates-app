<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2, Plus } from "lucide-svelte";
    import { createMatter } from "../store";
    import type { Matter } from "../store";
    import type { TaskStatus } from "$lib/types";
    import { v4 as uuidv4 } from "uuid";
    import { t } from "svelte-i18n";

    import StatusSelector from "$lib/components/status-selector.svelte";

    export let rowId: string;
    export let original: any;
    export let onDelete: (rowId: string) => void;
    export let onUpdateValue: (rowId: string, value: TaskStatus) => void;
    export let onAddMatter: (rowId: string) => void;

    let status: TaskStatus = original.status;
    const handleDelete = () => {
        onDelete(rowId);
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        onUpdateValue(rowId, newStatus);
    };

    const handleCreateMatter = async () => {
        onAddMatter(rowId);
    };
</script>

<div class="flex items-center gap-2">
    <StatusSelector {status} variant="outline" onStatusValueChange={handleStatusChange} />
    <Button variant="ghost" size="icon" onclick={handleCreateMatter} title={$t("app.repeat.addedDescription")}>
        <Plus class="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" onclick={handleDelete} title={$t("app.other.confirmDelete")}>
        <Trash2 class="h-4 w-4" />
    </Button>
</div>
