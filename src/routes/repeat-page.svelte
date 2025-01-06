<script lang="ts">
    import AlertDialog from "$lib/components/alert-dialog.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Table from "$lib/components/ui/table/index";
    import { t } from "svelte-i18n";
    import { v4 as uuidv4 } from "uuid";

    import { TableHandler } from "@vincjo/datatables";

    import DataTablePriorityCell from "./data-table-priority-cell.svelte";
    import DataTableRepeatActionCell from "./data-table-repeat-action-cell.svelte";
    import DataTableRepeatTimeCell from "./data-table-repeat-time-cell.svelte";
    import DataTableTagsCell from "./data-table-tags-cell.svelte";
    import DataTableTextInputCell from "./data-table-text-input-cell.svelte";

    import { Priority } from "$lib/types";
    import { emit } from "@tauri-apps/api/event";
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { onMount } from "svelte";
    import { repeatTaskAPI } from "../features/repeat-task.svelte";

    let localAllTags = $state<string[]>([]);
    let table = new TableHandler(repeatTaskAPI.data, { rowsPerPage: 10 });
    const search = table.createSearch();

    let alertOpen = $state(false);
    let alertTitle = $state("");
    let alertContent = $state("");
    let alertShowCancel = $state(false);
    let alertConfirm: () => Promise<void> = $state(async () => {});
    $effect(() => {
        repeatTaskAPI.data;
        repeatTaskAPI.allTags;
        table.setRows(repeatTaskAPI.data);
    });

    const handleDelete = async (rowId: string) => {
        alertTitle = $t("app.other.confirmDelete");
        alertContent = $t("app.other.confirmDeleteDescription");
        alertShowCancel = true;
        alertConfirm = async () => {
            await repeatTaskAPI.deleteRepeatTask(rowId);
        };
        alertOpen = true;
    };

    const handleCreate = async () => {
        const timestamp = new Date()
            .toLocaleString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
            .replace(/[\/\s:]/g, ""); // 格式如: 03151423 (3月15日14:23)

        const defaultTask = {
            id: uuidv4(),
            title: `#${$t("app.repeat.newTaskPrefix")}_${timestamp}`, // 例如: "新任务_03151423"
            tags: "",
            repeat_time: "127|08:00|10:00",
            priority: Priority.Medium,
            status: 1,
            description: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await repeatTaskAPI.createRepeatTask(defaultTask);
    };

    const handleAddMatter = async (rowId: string) => {
        const repeatTask = repeatTaskAPI.getRepeatTaskById(rowId);
        if (!repeatTask) {
            console.error("repeat task not found", rowId);
            return;
        }
        await repeatTaskAPI.createMatter(repeatTask);
        await emit("refresh-time-progress", {});
        alertTitle = $t("app.repeat.addedTip");
        alertContent = $t("app.repeat.addedDescription");
        alertShowCancel = false;
        alertConfirm = async () => {};
        alertOpen = true;
    };

    onMount(() => {
        new Promise(async (resolve, reject) => {
            await repeatTaskAPI.fetchAllTags();
            await repeatTaskAPI.fetchData();
            resolve(true);
        })
            .then(() => {
                console.log("fetch data success");
            })
            .catch((error) => {
                console.error("fetch data error: ", error);
            });
    });
    async function onUpdateValue(rowId: string, columnId: string, value: string | number) {
        let task = repeatTaskAPI.getRepeatTaskById(rowId);
        if (!task) {
            console.error("task not found", rowId);
            return;
        }
        if (columnId === "title") {
            await repeatTaskAPI.updateRepeatTask({ ...task, title: value as string });
        }
        if (columnId === "tags") {
            await repeatTaskAPI.updateRepeatTask({ ...task, tags: value as string });
        }
        if (columnId === "repeat_time") {
            await repeatTaskAPI.updateRepeatTask({ ...task, repeat_time: value as string });
        }
        if (columnId === "priority") {
            await repeatTaskAPI.updateRepeatTask({ ...task, priority: value as Priority });
        }
        if (columnId === "status") {
            await repeatTaskAPI.updateRepeatTask({ ...task, status: value as number });
        }
        if (columnId === "description") {
            await repeatTaskAPI.updateRepeatTask({ ...task, description: value as string });
        }
    }
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">{$t("app.repeat.title")}</Label>
        <Label class="text-base text-muted-foreground">
            {$t("app.repeat.description")}
        </Label>
    </div>
    <div class="flex flex-col flex-1 p-6 gap-2">
        <div class="flex items-center justify-between">
            <div class="flex flex-1 items-center space-x-2">
                <Input
                    placeholder={$t("app.repeat.searchPlaceholder")}
                    class="bg-background h-8 w-[150px] lg:w-[250px]"
                    type="search"
                    disabled={table.rows.length === 0}
                    bind:value={search.value}
                    oninput={() => {
                        search.set();
                    }}
                />
            </div>
            <div class="flex items-center space-x-2">
                <Button
                    onclick={() => {
                        handleCreate();
                    }}>{$t("app.repeat.createTask")}</Button
                >
            </div>
        </div>
        <div class="rounded-md border">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>{$t("app.repeat.columns.title")}</Table.Head>
                        <Table.Head>{$t("app.repeat.columns.tags")}</Table.Head>
                        <Table.Head>{$t("app.repeat.columns.repeatTime")}</Table.Head>
                        <Table.Head>{$t("app.repeat.columns.priority")}</Table.Head>
                        <Table.Head>{$t("app.repeat.columns.actions")}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if table.rows.length > 0}
                        <!-- RepeatTask -->
                        {#each table.rows as row (row.id)}
                            <Table.Row>
                                <Table.Cell>
                                    <DataTableTextInputCell
                                        rowId={row.id}
                                        value={row.title}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "title", newValue);
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell class="max-w-[224px] overflow-auto">
                                    <DataTableTagsCell
                                        rowId={row.id}
                                        allTags={repeatTaskAPI.allTags}
                                        selectedTags={row.tags ? row.tags.split(",") : []}
                                        onTagsChange={(rowId, allTags, selectedTags) => {
                                            repeatTaskAPI.createTagsIfNotExist(allTags.join(","));
                                            onUpdateValue(rowId, "tags", selectedTags.join(","));
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell class="max-w-[250px] overflow-auto">
                                    <DataTableRepeatTimeCell
                                        rowId={row.id}
                                        value={row.repeat_time}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "repeat_time", newValue);
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell class="w-[96px]">
                                    <DataTablePriorityCell
                                        rowId={row.id}
                                        value={row.priority}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "priority", newValue);
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell class="w-[208px]">
                                    <DataTableRepeatActionCell
                                        rowId={row.id}
                                        original={row}
                                        onDelete={(rowId) => {
                                            handleDelete(rowId);
                                        }}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "status", newValue);
                                        }}
                                        onAddMatter={(rowId) => {
                                            handleAddMatter(rowId);
                                        }}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </div>
        <div class="flex flex-row justify-between">
            <div class="flex flex-col">
                <Label class="text-sm text-muted-foreground">
                    {$t("app.repeat.totalRepeat")}: {table.rows.length}
                </Label>
            </div>
            <div class="flex justify-end items-center space-x-2">
                <Label class="text-sm text-muted-foreground">
                    {$t("app.other.page0")}
                    {table.currentPage}
                    {$t("app.other.page1")}
                    {Math.max(table.pageCount, 1)}
                    {$t("app.other.page2")}
                </Label>
                <Button
                    class="w-8 h-8"
                    disabled={table.currentPage === 1}
                    variant="outline"
                    size="icon"
                    onclick={() => table.setPage("previous")}
                >
                    <ChevronLeft />
                </Button>
                <Button
                    class="w-8 h-8"
                    disabled={table.currentPage === table.pageCount}
                    variant="outline"
                    size="icon"
                    onclick={() => table.setPage("next")}
                >
                    <ChevronRight />
                </Button>
            </div>
        </div>
    </div>
</div>

<AlertDialog
    bind:open={alertOpen}
    title={alertTitle}
    content={alertContent}
    onConfirm={alertConfirm}
    showCancel={alertShowCancel}
/>
