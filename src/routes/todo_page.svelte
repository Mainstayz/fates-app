<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import * as Table from "$lib/components/ui/table/index";
    import { v4 as uuidv4 } from "uuid";

    import { TableHandler } from "@vincjo/datatables";
    import DataTableTextInputCell from "./data_table_text_input_cell.svelte";
    import { ChevronLeft, ChevronRight, Trash2 } from "lucide-svelte";
    import * as store from "../store";
    import type { Todo } from "../store";
    import type { Matter } from "../store";
    import { onMount } from "svelte";
    import { emit } from "@tauri-apps/api/event";
    class TodoAPI {
        public data = $state<Todo[]>([]);

        async fetchData() {
            this.data = await store.getAllTodos();
        }

        async createTodo(todo: Todo) {
            await store.createTodo(todo);
            await this.fetchData();
        }

        async deleteTodo(id: string) {
            await store.deleteTodo(id);
            await this.fetchData();
        }

        async updateTodo(todo: Todo) {
            await store.updateTodo(todo.id, todo);
            await this.fetchData();
        }

        getTodoById(id: string) {
            return this.data.find((item) => item.id === id);
        }
    }

    const todoAPI = new TodoAPI();
    let table = new TableHandler(todoAPI.data, { rowsPerPage: 10 });
    const search = table.createSearch();

    $effect(() => {
        todoAPI.data;
        table.setRows(todoAPI.data);
    });

    const handleDelete = async (rowId: string) => {
        await todoAPI.deleteTodo(rowId);
    };

    const handleCreate = async () => {
        const timestamp = new Date()
            .toLocaleString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
            .replace(/[\/\s:]/g, "");

        const defaultTodo = {
            id: uuidv4(),
            title: `#新待办_${timestamp}`,
            status: "todo",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await todoAPI.createTodo(defaultTodo);
    };

    async function onUpdateValue(rowId: string, columnId: string, value: string) {
        let todo = todoAPI.getTodoById(rowId);
        if (!todo) {
            console.error("todo not found", rowId);
            return;
        }
        if (columnId === "title") {
            await todoAPI.updateTodo({ ...todo, title: value });
        }
    }

    const handleExecute = async (row: Todo) => {
        let start_time = new Date();
        // end_time 为 2 小时后
        const end_time = new Date(start_time.getTime() + 2 * 60 * 60 * 1000);

        const matter: Matter = {
            id: uuidv4(),
            title: row.title,
            type_: 2,
            start_time: start_time.toISOString(),
            end_time: end_time.toISOString(),
            priority: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reserved_1: "blue",
            reserved_2: row.id,
        };

        await store.createMatter(matter);
        await todoAPI.updateTodo({ ...row, status: "in_progress" });
        await emit("refresh-time-progress", {});
    };

    onMount(() => {
        todoAPI
            .fetchData()
            .then(() => {
                console.log("fetch data success");
            })
            .catch((error) => {
                console.error("fetch data error: ", error);
            });
    });
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">待办事项</Label>
        <Label class="text-base text-muted-foreground">这里列出了所有的待办事项，你可以添加、编辑和删除待办。</Label>
    </div>
    <div class="flex flex-col flex-1 p-6 gap-2">
        <div class="flex items-center justify-between">
            <div class="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="搜索待办标题..."
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
                    }}>创建待办</Button
                >
            </div>
        </div>
        <div class="rounded-md border">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>标题</Table.Head>
                        <Table.Head>状态</Table.Head>
                        <Table.Head>操作</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if table.rows.length > 0}
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
                                    <Badge
                                        variant={row.status === "completed"
                                            ? "default"
                                            : row.status === "in_progress"
                                              ? "secondary"
                                              : "outline"}
                                    >
                                        {row.status === "todo"
                                            ? "待办"
                                            : row.status === "in_progress"
                                              ? "进行中"
                                              : "已完成"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="flex gap-2">
                                        <Button variant="destructive" size="sm" onclick={() => handleDelete(row.id)}>
                                            <Trash2 />
                                        </Button>
                                        {#if row.status === "todo"}
                                            <Button variant="outline" size="sm" onclick={() => handleExecute(row)}>
                                                执行
                                            </Button>
                                        {/if}
                                    </div>
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
