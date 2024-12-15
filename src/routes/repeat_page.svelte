<script lang="ts">
    // import { Label } from "$lib/components/ui/label";
    // import { Input } from "$lib/components/ui/input";
    // import { get, writable } from "svelte/store";
    // import DataTableTagsCell from "./data_table_tags_cell.svelte";
    // import DataTableTextInputCell from "./data_table_text_input_cell.svelte";
    // import { z } from "zod";
    // import { v4 as uuidv4 } from "uuid";
    // import {
    //     createSvelteTable,
    //     getCoreRowModel,
    //     getFilteredRowModel,
    //     getPaginationRowModel,
    //     getSortedRowModel,
    //     type ColumnDef,
    //     type CellContext,
    // } from "@tanstack/svelte-table";
    // import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
    // import DataTablePriorityCell from "./data_table_priority_cell.svelte";
    // import { Priority } from "$lib/types";
    // import DataTableActionCell from "./data_table_action_cell.svelte";
    // import DataTableRepeatTimeCell from "./data_table_repeat_time_cell.svelte";
    // import { Button } from "$lib/components/ui/button";
    // import {
    //     getAllRepeatTasks,
    //     createRepeatTask,
    //     updateRepeatTask,
    //     deleteRepeatTask,
    //     createTag,
    //     getAllTags,
    // } from "../store";
    // import { onMount, onDestroy } from "svelte";

    // const RepeatScheme = z.object({
    //     id: z.string(),
    //     title: z.string(),
    //     tags: z.string().optional(),
    //     repeat_time: z.string(),
    //     priority: z.number(),
    //     status: z.number(),
    //     description: z.string().optional(),
    //     created_at: z.string(),
    //     updated_at: z.string(),
    // });

    // type RepeatTask = z.infer<typeof RepeatScheme>;

    // let data: RepeatTask[] = [];
    // let globalFilter = "";
    // let localAllTags: string[] = [];

    // const onUpdateValue = async (rowId: string, columnId: string, value: string | number) => {
    //     // Implementation here
    // };

    // const onTagsChange = async (rowId: string, columnId: string, allTags: string[], selectedTags: string[]) => {
    //     // Implementation here
    // };

    // const handleDelete = async (rowId: string) => {
    //     // Implementation here
    // };

    // const handleCreate = async () => {
    //     const defaultTask: Partial<RepeatTask> = {
    //         id: uuidv4(),
    //         title: "新任务",
    //         tags: "",
    //         repeat_time: "127|08:00|10:00",
    //         priority: Priority.Medium,
    //         status: 1,
    //         description: "",
    //     };

    //     try {
    //         const newTask = await createRepeatTask(defaultTask as RepeatTask);
    //         data = [newTask, ...data];
    //     } catch (error) {
    //         console.error("Failed to create task:", error);
    //     }
    // };

    // Column definitions
    // const columns: ColumnDef<RepeatTask>[] = [
    //     {
    //         accessorKey: "title",
    //         header: "标题",
    //         cell: (info) => {
    //             console.log("info", info);
    //             const div = document.createElement("div");
    //             div.innerHTML = info.getValue() as string;
    //             return div;
    // const component = new DataTableTextInputCell({
    //     target: document.createElement("div"),
    //     props: {
    //         value: info.getValue() as string,
    //         row: info.row,
    //         onUpdateValue: (value: string) => onUpdateValue(info.row.index.toString(), "title", value),
    //     },
    // });
    // return component;
    //     },
    // },
    // {
    //     accessorKey: "tags",
    //     header: "标签",
    //     cell: (info) => {
    //         const div = document.createElement("div");
    //         div.innerHTML = info.getValue() as string;
    //         return div;
    // const component = new DataTableTagsCell({
    //     target: document.createElement("div"),
    //     props: {
    //         value: info.getValue() as string,
    //         row: info.row,
    //         allTags: localAllTags,
    //         selectedTags: (info.getValue() as string)?.split(",") || [],
    //         onTagsChange: (allTags: string[], selectedTags: string[]) =>
    //             onTagsChange(info.row.index.toString(), "tags", allTags, selectedTags),
    //     },
    // });
    // return component;
    //     },
    // },
    // {
    //     accessorKey: "repeat_time",
    //     header: "添加的时间段",
    //     cell: (info) => {
    //         const div = document.createElement("div");
    //         div.innerHTML = info.getValue() as string;
    //         return div;
    // const component = new DataTableRepeatTimeCell({
    //     target: document.createElement("div"),
    //     props: {
    //         value: info.getValue() as string,
    //         row: info.row,
    //         onUpdateValue: (value: string) =>
    //             onUpdateValue(info.row.index.toString(), "repeat_time", value),
    //     },
    // });
    // return component;
    //     },
    // },
    // {
    //     accessorKey: "priority",
    //     header: "优先级",
    //     cell: (info) => {
    //         const div = document.createElement("div");
    //         div.innerHTML = info.getValue() as string;
    //         return div;
    // const component = new DataTablePriorityCell({
    //     target: document.createElement("div"),
    //     props: {
    //         value: info.getValue() as number,
    //         row: info.row,
    //         onUpdateValue: (value: number) => onUpdateValue(info.row.index.toString(), "priority", value),
    //     },
    // });
    // return component;
    //         },
    //     },
    //     {
    //         id: "actions",
    //         header: "操作",
    //         cell: (info) => {
    //             const component = new DataTableActionCell({
    //                 target: document.createElement("div"),
    //                 props: {
    //                     row: info.row,
    //                     original: info.row.original,
    //                     onDelete: () => handleDelete(info.row.index.toString()),
    //                     onUpdateValue,
    //                 },
    //             });
    //             return component;
    //         },
    //     },
    // ];

    // Create table instance
    // const table = createSvelteTable({
    //     get data() {
    //         return data;
    //     },
    //     columns,
    //     getCoreRowModel: getCoreRowModel(),
    //     getFilteredRowModel: getFilteredRowModel(),
    //     getSortedRowModel: getSortedRowModel(),
    //     getPaginationRowModel: getPaginationRowModel(),
    //     globalFilterFn: "includesString",
    //     state: {
    //         get globalFilter() {
    //             return globalFilter;
    //         },
    //     },
    // });

    // onMount(async () => {
    //     try {
    //         const tasks = await getAllRepeatTasks();
    //         data = tasks;
    //         const tags = await getAllTags();
    //         localAllTags = tags.map((tag: { name: string }) => tag.name).filter((tag: string) => tag !== "");
    //     } catch (error) {
    //         console.error("Failed to load data:", error);
    //     }
    // });

    // $: {
    //     $table.setGlobalFilter(globalFilter);
    // }
</script>

<!-- <div class="flex flex-col h-full">
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
                    bind:value={globalFilter}
                />
            </div>
            <div class="flex items-center space-x-2">
                <Button onclick={handleCreate}>创建任务</Button>
            </div>
        </div>
        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    {#each $table.getHeaderGroups() as headerGroup}
                        <TableRow>
                            {#each headerGroup.headers as header}
                                <TableHead>
                                    {#if header.isPlaceholder}
                                        <span />
                                    {:else}
                                        {header.column.columnDef.header}
                                    {/if}
                                </TableHead>
                            {/each}
                        </TableRow>
                    {/each}
                </TableHeader>
                <TableBody>
                    {#each $table.getRowModel().rows as row}
                        <TableRow>
                            {#each row.getVisibleCells() as cell}
                                <TableCell>
                                    {#if typeof cell.column.columnDef.cell === "function"}
                                        {@const component = cell.column.columnDef.cell({
                                            ...cell,
                                            getValue: () => cell.getValue(),
                                            row: cell.row,
                                            table: $table,
                                            cell: cell,
                                        })}
                                        <div>{@html component.$$.root.innerHTML}</div>
                                    {:else}
                                        {cell.getValue()}
                                    {/if}
                                </TableCell>
                            {/each}
                        </TableRow>
                    {/each}
                </TableBody>
            </Table>
        </div>
    </div>
</div> -->
