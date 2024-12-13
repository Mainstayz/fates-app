<script lang="ts">
    import type { TimelineItem } from "$lib/types";
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { get, readable, writable } from "svelte/store";
    import DataTableTagsCell from "./data_table_tags_cell.svelte";
    import DataTableTextInputCell from "./data_table_text_input_cell.svelte";
    import { z } from "zod";

    import { Render, Subscribe, createRender, createTable } from "svelte-headless-table";
    import {
        addColumnFilters,
        addHiddenColumns,
        addPagination,
        addSelectedRows,
        addSortBy,
        addTableFilter,
    } from "svelte-headless-table/plugins";
    import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
    import DataTablePriorityCell from "./data_table_priority_cell.svelte";
    import { Priority } from "$lib/types";
    import DataTableStatusCell from "./data_table_status_cell.svelte";
    import { TaskStatus } from "$lib/types";

    // 重复任务的 schema
    const RepeatScheme = z.object({
        title: z.string(),
        tags: z.array(z.string()),
        period: z.string(),
        priority: z.nativeEnum(Priority),
        status: z.nativeEnum(TaskStatus),
    });

    type RepeatTask = z.infer<typeof RepeatScheme>;
    let localItems: RepeatTask[] = [
        {
            title: "喝水",
            tags: ["喝水", "健康"],
            period: "每天",
            priority: Priority.High,
            status: TaskStatus.Active,
        },
    ];
    const tableHeader = ["标题", "标签", "周期", "优先级", "状态"];

    let onUpdateValue = (rowDataId: string, columnId: string, newValue: any) => {
        // 获取索引，第几行
        let index = parseInt(rowDataId);
        let item = localItems[index];
        if (columnId === "title") {
            item.title = newValue;
        } else if (columnId === "priority") {
            item.priority = newValue;
        } else if (columnId === "status") {
            item.status = newValue;
        }
        console.log(localItems);
    };

    let onTagsChange = (rowDataId: string, columnId: string, allTags: string[], selectedTags: string[]) => {
        console.log(rowDataId, columnId, allTags, selectedTags);
    };

    let allTags = $state<string[]>([]);

    // data 是一个 Svelte 存储，包含要在表上显示的数据数组。如果需要更新数据（例如，编辑表或从服务器延迟获取数据时），请使用 Writable 存储。
    // https://svelte-headless-table.bryanmylee.com/docs/api/create-table
    let table = createTable(writable(localItems), {
        select: addSelectedRows(),
        sort: addSortBy({
            // https://svelte-headless-table.bryanmylee.com/docs/plugins/add-sort-by
            toggleOrder: ["asc", "desc"],
        }),
        page: addPagination(),
        filter: addTableFilter({
            // https://svelte-headless-table.bryanmylee.com/docs/plugins/add-table-filter
            fn: ({ filterValue, value }) => {
                // filterValue 是一个 string，value 会被序列化为 string。
                return value.toLowerCase().includes(filterValue.toLowerCase());
            },
        }),
        colFilter: addColumnFilters(),
    });

    const columns = table.createColumns([
        table.column({
            // 如果 accessor 是字符串，则该属性必须作为每个数据项上的直接属性存在。如果需要嵌套或计算属性，请传递函数访问器。
            accessor: "title",
            header: () => {
                return tableHeader[0];
            },
            // 单个表上不允许有重复的 id。
            id: "title",
            //  columnDef.cell?: (dataCell, state) => RenderConfig
            // 定义用于数据列的正文单元格的组件。默认返回 dataCell. value。
            cell: ({ column, row, value }) => {
                return createRender(DataTableTextInputCell, {
                    row,
                    column,
                    value,
                    onUpdateValue,
                });
            },
        }),
        table.column({
            accessor: "tags",
            header: () => {
                return tableHeader[1];
            },
            id: "tags",
            // https://svelte-headless-table.bryanmylee.com/docs/api/body-cell#databodycell
            cell: ({ column, row, value }) => {
                // value = ["喝水", "健康"]
                return createRender(DataTableTagsCell, {
                    row,
                    column,
                    allTags,
                    selectedTags: value,
                    onTagsChange,
                });
            },
        }),
        table.column({
            accessor: "period",
            header: () => {
                return tableHeader[2];
            },
            id: "period",
        }),
        table.column({
            accessor: "priority",
            header: () => {
                return tableHeader[3];
            },
            id: "priority",
            cell: ({ column, row, value }) => {
                return createRender(DataTablePriorityCell, {
                    row,
                    column,
                    value,
                    onUpdateValue,
                });
            },
        }),
        table.column({
            accessor: "status",
            header: () => {
                return tableHeader[4];
            },
            id: "status",
            cell: ({ column, row, value }) => {
                return createRender(DataTableStatusCell, {
                    row,
                    column,
                    value,
                    onUpdateValue,
                });
            },
        }),
    ]);
    let tableModel = table.createViewModel(columns);
    console.log(tableModel);
    const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = tableModel;
    console.log("headerRows", headerRows);
    console.log("pageRows", pageRows);
    console.log("tableAttrs", tableAttrs);
    console.log("tableBodyAttrs", tableBodyAttrs);

    // 过滤器
    let filterValue = $state("");
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">重复任务</Label>
        <Label class="text-base text-muted-foreground">重复任务是一些需要定期执行的任务，例如每天的喝水、运动等。</Label
        >
    </div>
    <div class="flex flex-col flex-1 p-6 gap-4">
        <!-- ToolBar -->
        <div class="flex items-center justify-between">
            <div class="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="Filter tasks..."
                    class="bg-background h-8 w-[150px] lg:w-[250px]"
                    type="search"
                    bind:value={filterValue}
                />
            </div>
        </div>
        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    {#each $headerRows as headerRow}
                        <!-- 允许你在 Svelte 模板中订阅非顶层存储 svelte-subscribe. -->
                        <!-- https://svelte-headless-table.bryanmylee.com/docs/api/subscribe -->
                        <Subscribe rowAttrs={headerRow.attrs()}>
                            <TableRow>
                                {#each headerRow.cells as cell (cell.id)}
                                    <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                                        <TableHead>
                                            <Render of={cell.render()} />
                                        </TableHead>
                                    </Subscribe>
                                {/each}
                            </TableRow>
                        </Subscribe>
                    {/each}
                </TableHeader>
                <TableBody {...$tableBodyAttrs}>
                    {#if $pageRows.length}
                        {#each $pageRows as row (row.id)}
                            <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
                                <TableRow {...rowAttrs}>
                                    {#each row.cells as cell (cell.id)}
                                        <Subscribe attrs={cell.attrs()} let:attrs>
                                            <TableCell {...attrs}>
                                                <Render of={cell.render()} />
                                            </TableCell>
                                        </Subscribe>
                                    {/each}
                                </TableRow>
                            </Subscribe>
                        {/each}
                    {:else}
                        <TableRow>
                            <TableCell colspan={columns.length} class="h-24 text-center">No results.</TableCell>
                        </TableRow>
                    {/if}
                </TableBody>
            </Table>
        </div>
    </div>
</div>
