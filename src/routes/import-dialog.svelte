<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Card } from "$lib/components/ui/card";
    import { Calendar, Mail, PlusCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { isTauri } from "$src/platform";
    import { onMount } from "svelte";
    import * as Table from "$lib/components/ui/table/index";
    import { TableHandler } from "@vincjo/datatables";
    import type { Matter } from "$src/types";
    import dayjs from "dayjs";
    import { t } from "svelte-i18n";
    import platform from "$src/platform";
    import { toast } from "svelte-sonner";

    let { open = $bindable() } = $props();

    let currentSource: "calendar" | "outlook" | null = $state(null);
    let currentStep: "select" | "guide" | "preview" | "complete" = $state("select");
    let dataItems: any[] = $state([]);
    let repeatMatterCount = $state(0);
    let createMatterCount = $state(0);

    // svelte
    let ImportCalendarGuide = $state<any>(null);

    // 导入源列表
    let importSources = [
        {
            id: "calendar",
            name: $t("app.import.calendar.name"),
            icon: Calendar,
            description: $t("app.import.calendar.description"),
            show: true,
        },
        // TODO：outlook 导入
        // {
        //     id: "outlook",
        //     name: $t("app.import.outlook.name"),
        //     icon: Mail,
        //     description: $t("app.import.outlook.description"),
        //     show: true,
        // },
    ];

    importSources = importSources.filter((source) => source.show);

    let table = new TableHandler<Matter>([], { rowsPerPage: 10 });

    $effect(() => {
        let matters = mapToMatter(dataItems);
        table.setRows(matters);
    });

    function mapToMatter(dataItems: any[]) {
        let matters = dataItems.map((item: any) => {
            let now = dayjs().toISOString();
            let newItem: Matter = {
                id: item.id,
                title: item.title,
                description: item.description,
                start_time: item.start_time,
                end_time: item.end_time,
                type_: item.type_,
                sub_type: item.sub_type,
                priority: item.priority,
                created_at: now,
                updated_at: now,
                reserved_1: "blue",
            };
            return newItem;
        });
        return matters;
    }

    onMount(async () => {
        if (isTauri) {
            ImportCalendarGuide = (await import("$src/lib/components/import-calendar-data.svelte")).default;
        }
    });

    async function createMatter(matter: Matter, forceToast = false) {
        let id = matter.id;
        let oldMatter = await platform.instance.storage.getMatter(id);
        if (oldMatter) {
            console.log("matter already exists, title:", oldMatter.title);
            if (forceToast) {
                // 日程 "XXX" 已经存在，跳过
                toast.info($t("app.import.matterAlreadyExists", { values: { title: oldMatter.title } }));
            }
            repeatMatterCount++;
            return;
        }

        await platform.instance.storage.createMatter(matter);
        createMatterCount++;
    }

    async function deleteMatter(matter: Matter) {
        let rows = [...table.rows];
        let index = rows.findIndex((row) => row.id === matter.id);
        if (index !== -1) {
            rows.splice(index, 1);
        }
        table.setRows(rows);
    }

    async function handleImportAll() {
        let matters = mapToMatter(dataItems);
        for (let matter of matters) {
            await createMatter(matter);
        }
        // 导入完成
        currentStep = "complete";
    }

    function closeDialog() {
        open = false;
        handleBack();
    }

    // 处理导入源选择
    function handleSourceSelect(source: typeof currentSource) {
        currentSource = source;
        currentStep = "guide";
        dataItems = [];
    }

    // 返回选择界面
    function handleBack() {
        currentSource = null;
        repeatMatterCount = 0;
        createMatterCount = 0;
        dataItems = [];
        currentStep = "select";
    }

    // 进入预览步骤
    function handleNextStep() {
        currentStep = "preview";
    }

    // 处理数据导入
    function handleDataItems(data: any) {
        console.log("dataItems", data);
        dataItems = data;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Overlay class="bg-[#000000]/20" />
    <Dialog.Content class="sm:max-w-[800px] h-[600px]">
        <div class="h-full flex flex-col">
            {#if currentStep === "select"}
                <div class="flex flex-col p-4">
                    <h3 class="text-xl font-semibold mb-6">{$t("app.import.selectSource")}</h3>
                    <div class="flex-1 grid gap-4 overflow-auto">
                        {#if importSources.length > 0}
                            {#each importSources as source}
                                {#if source.show}
                                    <Card
                                        class="p-4 cursor-pointer hover:bg-secondary/50"
                                        onclick={() => handleSourceSelect(source.id as typeof currentSource)}
                                    >
                                        <div class="flex items-center gap-4">
                                            <source.icon class="w-6 h-6" />
                                            <div>
                                                <h3 class="text-lg font-semibold">{source.name}</h3>
                                                <p class="text-muted-foreground">{source.description}</p>
                                            </div>
                                        </div>
                                    </Card>
                                {/if}
                            {/each}
                        {:else}
                            <div class="flex justify-center items-center h-full">
                                <p class="text-muted-foreground">{$t("app.import.noSource")}</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {:else}
                <div class="flex flex-col h-full p-4">
                    <div class="flex-1 bg-card rounded-lg overflow-auto">
                        <!-- 操作指引 -->
                        {#if currentStep === "guide"}
                            <div class="space-y-4">
                                <h3 class="text-xl font-semibold">{$t("app.import.guide.title")}</h3>
                                <p class="text-muted-foreground">
                                    {#if currentSource === "calendar"}
                                        <ImportCalendarGuide callback={handleDataItems} />
                                    {:else if currentSource === "outlook"}
                                        {$t("app.import.outlook.guide")}
                                    {/if}
                                </p>
                            </div>
                        {:else if currentStep === "preview"}
                            <div class="space-y-4">
                                <h3 class="text-xl font-semibold">{$t("app.import.preview.title")}</h3>

                                <div class="rounded-md border overflow-auto h-[360px]">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head>{$t("app.import.preview.columns.title")}</Table.Head>
                                                <Table.Head class="w-[144px]"
                                                    >{$t("app.import.preview.columns.startTime")}</Table.Head
                                                >
                                                <Table.Head class="w-[144px]"
                                                    >{$t("app.import.preview.columns.endTime")}</Table.Head
                                                >
                                                <Table.Head class="w-[176px]"
                                                    >{$t("app.import.preview.columns.action")}</Table.Head
                                                >
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each table.rows as row (row.id)}
                                                <Table.Row>
                                                    <Table.Cell>
                                                        <Label class="font-bold">{row.title}</Label>
                                                    </Table.Cell>
                                                    <Table.Cell
                                                        >{dayjs(row.start_time).format("YYYY-MM-DD HH:mm")}</Table.Cell
                                                    >
                                                    <Table.Cell
                                                        >{dayjs(row.end_time).format("YYYY-MM-DD HH:mm")}</Table.Cell
                                                    >
                                                    <Table.Cell>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onclick={() => createMatter(row, true)}
                                                        >
                                                            <PlusCircle class="w-4 h-4" />
                                                            {$t("app.import.preview.actions.import")}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onclick={() => deleteMatter(row)}
                                                        >
                                                            <Trash2 class="w-4 h-4" />
                                                            {$t("app.import.preview.actions.delete")}
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                                <div class="flex flex-row justify-between">
                                    <div class="flex flex-col">
                                        <!-- total todo count -->
                                        <Label class="text-sm text-muted-foreground">
                                            {$t("app.todo.totalTodo")}: {dataItems.length}
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
                        {:else if currentStep === "complete"}
                            <div class="space-y-4">
                                <h3 class="text-xl font-semibold">{$t("app.import.complete.title")}</h3>
                                <p class="text-muted-foreground">
                                    {$t("app.import.complete.description", {
                                        values: { count: repeatMatterCount, count1: createMatterCount },
                                    })}
                                </p>
                            </div>
                        {/if}
                    </div>
                    <div class="flex justify-end gap-2 bg-background">
                        <Button variant="outline" onclick={handleBack}>{$t("app.import.actions.back")}</Button>
                        {#if currentStep === "guide"}
                            <Button variant="outline" onclick={handleNextStep} disabled={dataItems.length === 0}
                                >{$t("app.import.actions.next")}</Button
                            >
                        {:else if currentStep === "preview"}
                            <Button variant="outline" onclick={handleImportAll}
                                >{$t("app.import.actions.importAll")}</Button
                            >
                        {:else if currentStep === "complete"}
                            <Button variant="outline" onclick={closeDialog}>
                                {$t("app.import.actions.close")}
                            </Button>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>
