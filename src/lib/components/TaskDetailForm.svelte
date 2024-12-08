<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { PanelTop, Plus } from "lucide-svelte";
    let title = $state("");
    let startDate = $state(new Date().toISOString().split("T")[0]);
    let endDate = $state(new Date().toISOString().split("T")[0]);
    let priority = $state("medium");

    title = "今天似乎是个好日子";

    const PRIORITY_OPTIONS = [
        { value: "high", label: "高优先级" },
        { value: "medium", label: "中优先级" },
        { value: "low", label: "低优先级" },
    ];
</script>

<!-- 水平布局 -->
<div class="flex flex-row">
    <div class="flex-1 flex-col pr-[80px]">
        <!-- 标题 -->
        <div class="flex flex-row gap-2">
            <div class="pt-[6px]">
                <PanelTop size={24} class="mb-2" />
            </div>
            <Input
                type="text"
                class="border-0 shadow-none font-bold text-xl"
                bind:value={title}
                placeholder="任务标题"
            />
        </div>
        <!-- Tags，以及 优先级 -->
        <div class="flex flex-row gap-2">
            <!-- Icon -->
            <div class="pt-[6px] w-[24px]"></div>
            <div class="flex flex-row pl-[12px] gap-2">
                <div class="flex-col">
                    <div class="text-sm text-gray-500">标签</div>
                    <div class="text-sm text-gray-500">
                        <Button variant="ghost" size="icon">
                            <Plus size={16} />
                        </Button>
                    </div>
                </div>
                <div class="flex-col">
                    <div class="text-sm text-gray-500">优先级</div>
                    <div class="text-sm text-gray-500">
                        <Button variant="ghost" size="icon">
                            <Plus size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
</style>
