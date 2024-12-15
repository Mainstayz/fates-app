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
    import {
        Table,
        TableHeader,
        TableBody,
        TableRow,
        TableHead,
        TableCell,
        TableFooter,
    } from "$lib/components/ui/table";
    import DataTablePriorityCell from "./data_table_priority_cell.svelte";
    import { Priority } from "$lib/types";
    import DataTableStatusCell from "./data_table_status_cell.svelte";
    import { TaskStatus } from "$lib/types";
    import DataTableActionCell from "./data_table_action_cell.svelte";
    import RepeatTimeSelector from "$lib/components/RepeatTimeSelector.svelte";
    import DataTableRepeatTimeCell from "./data_table_repeat_time_cell.svelte";
    import { parseRepeatTimeString, formatRepeatTimeValue } from "$lib/utils/repeatTime";
    import { Button } from "$lib/components/ui/button";

    // 重复任务的 schema
    const RepeatScheme = z.object({
        title: z.string(),
        tags: z.array(z.string()),
        repeatTime: z.string(),
        priority: z.nativeEnum(Priority),
        status: z.nativeEnum(TaskStatus),
    });

    type RepeatTask = z.infer<typeof RepeatScheme>;
    let itemsStore = writable<RepeatTask[]>([
        {
            title: "喝水",
            tags: ["喝水", "健康"],
            repeatTime: "62|08:00|12:00",
            priority: Priority.High,
            status: TaskStatus.Active,
        },
        {
            title: "谢谢",
            tags: ["谢谢", "健康"],
            repeatTime: "62|08:00|12:00",
            priority: Priority.High,
            status: TaskStatus.Active,
        },
    ]);
    const tableHeader = ["标题", "标签", "添加的时间段", "优先级", "操作"];

    let onUpdateValue = (rowDataId: string, columnId: string, newValue: any) => {
        const index = parseInt(rowDataId);
        itemsStore.update((items) => {
            const item = items[index];
            if (columnId === "title") {
                item.title = newValue;
            } else if (columnId === "priority") {
                item.priority = newValue;
            } else if (columnId === "status") {
                item.status = newValue;
            } else if (columnId === "repeatTime") {
                item.repeatTime = newValue;
            }
            return items;
        });
        console.log("Updated store:", get(itemsStore));
    };

    let onTagsChange = (rowDataId: string, columnId: string, allTags: string[], selectedTags: string[]) => {
        console.log(rowDataId, columnId, allTags, selectedTags);
    };

    let allTags = $state<string[]>([]);

    // data 是一个 Svelte 存储，包含要在表上显示的数据数组。如果需要更新数据（例如，编辑表或从服务器延迟获取数据时），请使用 Writable 存储。
    // https://svelte-headless-table.bryanmylee.com/docs/api/create-table
    let table = createTable(itemsStore, {
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

    const handleDelete = (rowId: string) => {
        console.log("handleDelete", rowId);
        const index = parseInt(rowId);
        itemsStore.update((items) => items.filter((_, i) => i !== index));
    };

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
            // 定义用于数据列的正文单元格的组件。默认返回 dataCell.value。
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
            accessor: "repeatTime",
            header: () => {
                return tableHeader[2];
            },
            id: "repeatTime",
            cell: ({ column, row, value }) => {
                return createRender(DataTableRepeatTimeCell, {
                    row,
                    column,
                    value,
                    onUpdateValue,
                });
            },
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
        table.display({
            id: "actions",
            header: () => "操作",
            cell: ({ row }) => {
                if (row.isData()) {
                    return createRender(DataTableActionCell, {
                        row,
                        original: row.original,
                        onDelete: handleDelete,
                        onUpdateValue,
                    });
                }
                return "";
            },
        }),
    ]);
    let tableModel = table.createViewModel(columns);
    console.log(tableModel);
    const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates } = tableModel;
    console.log("headerRows", headerRows);
    console.log("pageRows", pageRows);
    console.log("tableAttrs", tableAttrs);
    console.log("tableBodyAttrs", tableBodyAttrs);

    // 过滤器
    let { filterValue } = pluginStates.filter;
    // let filterValue = $state("");

    const handleCreate = () => {
        const defaultTask: RepeatTask = {
            title: "新任务",
            tags: [],
            repeatTime: "127|08:00|10:00",
            priority: Priority.Medium,
            status: TaskStatus.Active,
        };

        itemsStore.update((items) => {
            return [defaultTask, ...items];
        });
    };

    const invoices = [
        {
            invoice: "INV001",
            paymentStatus: "Paid",
            totalAmount: "$250.00",
            paymentMethod: "Credit Card",
        },
        {
            invoice: "INV002",
            paymentStatus: "Pending",
            totalAmount: "$150.00",
            paymentMethod: "PayPal",
        },
        {
            invoice: "INV003",
            paymentStatus: "Unpaid",
            totalAmount: "$350.00",
            paymentMethod: "Bank Transfer",
        },
        {
            invoice: "INV004",
            paymentStatus: "Paid",
            totalAmount: "$450.00",
            paymentMethod: "Credit Card",
        },
        {
            invoice: "INV005",
            paymentStatus: "Paid",
            totalAmount: "$550.00",
            paymentMethod: "PayPal",
        },
        {
            invoice: "INV006",
            paymentStatus: "Pending",
            totalAmount: "$200.00",
            paymentMethod: "Bank Transfer",
        },
        {
            invoice: "INV007",
            paymentStatus: "Unpaid",
            totalAmount: "$300.00",
            paymentMethod: "Credit Card",
        },
    ];
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">重复任务</Label>
        <Label class="text-base text-muted-foreground">重复任务是一些需要定期执行的任务，例如每天的喝水、运动等。</Label
        >
    </div>
    <div class="flex flex-col flex-1 p-6 gap-2">
        <!-- ToolBar -->
        <div class="flex items-center justify-between">
            <div class="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="搜索任务标题..."
                    class="bg-background h-8 w-[150px] lg:w-[250px]"
                    type="search"
                    bind:value={$filterValue}
                />
            </div>
            <div class="flex items-center space-x-2">
                <Button onclick={handleCreate}>创建任务</Button>
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
                                        <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                                            <TableCell {...attrs} class={props.filter.matches ? "matches" : ""}>
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
        <div class="p-4 w-[200px] h-[200px]"></div>
    </div>
</div>
