<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import * as Table from "$lib/components/ui/table/index";
    import { v4 as uuidv4 } from "uuid";

    import { TableHandler, Datatable, ThSort, ThFilter } from "@vincjo/datatables";

    import DataTableTagsCell from "./data_table_tags_cell.svelte";
    import DataTableTextInputCell from "./data_table_text_input_cell.svelte";
    import DataTableRepeatTimeCell from "./data_table_repeat_time_cell.svelte";
    import DataTablePriorityCell from "./data_table_priority_cell.svelte";
    import DataTableActionCell from "./data_table_action_cell.svelte";

    import { Priority } from "$lib/types";
    import { onMount, onDestroy } from "svelte";
    import { repeatTaskAPI } from "../repeat-task.svelte";
    import { ChevronLeft, ChevronRight } from "lucide-svelte";

    let localAllTags = $state<string[]>([]);
    let table = new TableHandler(repeatTaskAPI.data, { rowsPerPage: 10 });
    const search = table.createSearch();

    $effect(() => {
        repeatTaskAPI.data;
        repeatTaskAPI.allTags;
        table.setRows(repeatTaskAPI.data);
    });

    // $effect(() => {
    //     // table.setRows(repeatTaskAPI.data);
    // });
    // const onUpdateValue = async (rowId: string, columnId: string, value: string | number) => {
    //     // Implementation here
    // };

    // const onTagsChange = async (rowId: string, columnId: string, allTags: string[], selectedTags: string[]) => {
    //     // Implementation here
    // };

    const handleDelete = async (rowId: string) => {
        await repeatTaskAPI.deleteRepeatTask(rowId);
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
            title: `#新任务_${timestamp}`, // 例如: "新任务_03151423"
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
        <Label class="text-2xl font-bold tracking-tight">重复任务</Label>
        <Label class="text-base text-muted-foreground">
            重复任务是一些需要定期执行的任务，例如每天的喝水、运动等。
        </Label>
    </div>
    <div class="flex flex-col flex-1 p-6 gap-2">
        <div class="flex items-center justify-between">
            <div class="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="搜索任务标题..."
                    class="bg-background h-8 w-[150px] lg:w-[250px]"
                    type="search"
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
                    }}>创建任务</Button
                >
            </div>
        </div>
        <div class="rounded-md border">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>标题</Table.Head>
                        <Table.Head>标签</Table.Head>
                        <Table.Head>重复时间</Table.Head>
                        <Table.Head>优先级</Table.Head>
                        <Table.Head>操作</Table.Head>
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
                                <Table.Cell>
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
                                <Table.Cell>
                                    <DataTableRepeatTimeCell
                                        rowId={row.id}
                                        value={row.repeat_time}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "repeat_time", newValue);
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <DataTablePriorityCell
                                        rowId={row.id}
                                        value={row.priority}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "priority", newValue);
                                        }}
                                    />
                                </Table.Cell>
                                <Table.Cell>
                                    <DataTableActionCell
                                        rowId={row.id}
                                        original={row}
                                        onDelete={(rowId) => {
                                            handleDelete(rowId);
                                        }}
                                        onUpdateValue={(rowId, newValue) => {
                                            onUpdateValue(rowId, "status", newValue);
                                        }}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </div>
        <div class="flex justify-end items-center space-x-2">
            <Label class="text-sm text-muted-foreground">
                第 {table.currentPage} 页，共 {table.pageCount} 页
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
