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
    import AlertDialog from "$lib/components/AleatDialog.svelte";
    import { t } from "svelte-i18n";

    let alertOpen = $state(false);
    let alertTitle = $state("");
    let alertContent = $state("");
    let alertConfirm: () => Promise<void> = $state(async () => {});
    class TodoAPI {
        public data = $state<Todo[]>([]);
        private matters: Matter[] = [];

        async syncTodoStatus() {
            // 获取所有类型为 2 的 matter
            console.log("syncTodoStatus ... ");
            const matters = await store.queryMattersByField("type", "2", true);
            this.matters = matters;
            const now = new Date();

            // 获取最新的待办事项数据
            const todos = await store.getAllTodos();
            const getTodoById = (id: string) => todos.find((item) => item.id === id);
            // 如果 todos 存在，但是 matter 不存在，则重置  todo.status 为 todo
            for (const todo of todos) {
                if (!this.matters.some((matter) => matter.reserved_2 === todo.id)) {
                    await store.updateTodo(todo.id, { ...todo, status: "todo" });
                }
            }

            for (const matter of matters) {
                const todoId = matter.reserved_2;
                if (!todoId) {
                    continue;
                }

                const todo = getTodoById(todoId);
                if (!todo) {
                    continue;
                }

                const startTime = new Date(matter.start_time);
                const endTime = new Date(matter.end_time);

                let newStatus = todo.status;
                if (now < startTime) {
                    newStatus = "todo";
                } else if (now >= startTime && now <= endTime) {
                    newStatus = "in_progress";
                } else if (now > endTime) {
                    newStatus = "completed";
                }

                if (newStatus !== todo.status) {
                    await store.updateTodo(todoId, { ...todo, status: newStatus });
                }
            }
        }

        async fetchData() {
            await this.syncTodoStatus();
            this.data = await store.getAllTodos();
        }

        async createTodo(todo: Todo) {
            await store.createTodo(todo);
            await this.fetchData();
        }

        async deleteTodo(id: string) {
            alertTitle = $t("app.other.confirmDelete");
            alertContent = $t("app.other.confirmDeleteDescription");
            alertConfirm = async () => {
                await store.deleteTodo(id);
                await this.fetchData();
            };
            alertOpen = true;
        }

        async updateTodo(todo: Todo) {
            await store.updateTodo(todo.id, todo);
            await this.fetchData();
        }

        getTodoById(id: string) {
            return this.data.find((item) => item.id === id);
        }

        isTodoInProgress(todoId: string): boolean {
            return this.matters.some((matter) => matter.reserved_2 === todoId);
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
        const defaultTodo = {
            id: uuidv4(),
            title: `${$t("app.todo.defaultTodoTitle")}`,
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
        alertTitle = $t("app.other.tip");
        alertContent = $t("app.todo.todoInProgressDescription");
        alertConfirm = async () => {};
        alertOpen = true;
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
        <Label class="text-2xl font-bold tracking-tight">{$t("app.todo.title")}</Label>
        <Label class="text-base text-muted-foreground">{$t("app.todo.description")}</Label>
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
                        <Table.Head>{$t("app.todo.name")}</Table.Head>
                        <Table.Head>{$t("app.todo.status")}</Table.Head>
                        <Table.Head>{$t("app.todo.action")}</Table.Head>
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
                                            ? $t("app.todo.statusOptions.todo")
                                            : row.status === "in_progress"
                                              ? $t("app.todo.statusOptions.in_progress")
                                              : $t("app.todo.statusOptions.completed")}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="flex gap-2">
                                        <Button variant="destructive" size="sm" onclick={() => handleDelete(row.id)}>
                                            <Trash2 />
                                        </Button>
                                        {#if row.status === "todo"}
                                            {#if todoAPI.isTodoInProgress(row.id)}
                                                <Button disabled variant="outline" size="sm">已添加</Button>
                                            {:else}
                                                <Button variant="outline" size="sm" onclick={() => handleExecute(row)}>
                                                    {$t("app.todo.todoInProgress")}
                                                </Button>
                                            {/if}
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
                {$t("app.other.page0")}
                {table.currentPage}
                {$t("app.other.page1")}
                {table.pageCount}
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

<AlertDialog
    bind:open={alertOpen}
    title={alertTitle}
    content={alertContent}
    onConfirm={alertConfirm}
    showCancel={true}
/>
