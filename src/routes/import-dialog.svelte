<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card } from "$lib/components/ui/card";
    import { Calendar, Mail } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { isTauri } from "$src/platform";
    import { onMount } from "svelte";

    let currentSource: "calendar" | "outlook" | null = $state(null);
    let currentStep: "select" | "guide" | "preview" = $state("select");
    let importProgress = $state(0);
    let { open = $bindable() } = $props();

    let dataItems: any[] = $state([]);

    let ImportCalendarGuide = $state<any>(null);

    // 导入源列表
    const importSources = [
        {
            id: "calendar",
            name: "本机日历",
            icon: Calendar,
            description: "从系统日历导入待办事项",
            show: isTauri,
        },
        {
            id: "outlook",
            name: "Outlook",
            icon: Mail,
            description: "从 Outlook 日历导入待办事项",
            show: true,
        },
    ];

    onMount(async () => {
        if (isTauri) {
            ImportCalendarGuide = (await import("$src/lib/components/import-calendar-data.svelte")).default;
        }
    });

    // 处理导入源选择
    function handleSourceSelect(source: typeof currentSource) {
        currentSource = source;
        currentStep = "guide";
        dataItems = [];
    }

    // 返回选择界面
    function handleBack() {
        currentSource = null;
        currentStep = "select";
        importProgress = 0;
        dataItems = [];
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
                    <h3 class="text-xl font-semibold mb-6">选择导入源</h3>
                    <div class="flex-1 grid gap-4 overflow-auto">
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
                    </div>
                </div>
            {:else}
                <div class="flex flex-col h-full p-4">
                    <div class="flex-1 bg-card rounded-lg overflow-auto">
                        <!-- 操作指引 -->
                        {#if currentStep === "guide"}
                            <div class="space-y-4">
                                <h3 class="text-xl font-semibold">操作指引</h3>
                                <p class="text-muted-foreground">
                                    {#if currentSource === "calendar"}
                                        <ImportCalendarGuide callback={handleDataItems} />
                                    {:else if currentSource === "outlook"}
                                        请确保已登录 Outlook 账号并授权访问。
                                    {/if}
                                </p>
                            </div>
                        {:else if currentStep === "preview"}
                            <div class="space-y-4">
                                <h3 class="text-xl font-semibold">数据预览</h3>
                                <!-- 这里将添加数据预览表格 -->
                            </div>
                        {/if}
                    </div>
                    <div class="flex justify-end gap-2 bg-background">
                        <Button variant="outline" onclick={handleBack}>返回</Button>
                        {#if currentStep === "guide"}
                            <Button onclick={handleNextStep} disabled={dataItems.length === 0}>开始导入</Button>
                        {:else if currentStep === "preview"}
                            <Button>全部导入</Button>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>
