<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Accordion from "$lib/components/ui/accordion";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Switch } from "$lib/components/ui/switch";
    import { Label } from "$lib/components/ui/label";
    import * as Popover from "$lib/components/ui/popover";

    let useCustomContent = $state(false);
    let accordionValue = $state<string | undefined>(undefined);
    let outputContent = $state("");

    $effect(() => {
        // 当 Switch 打开时展开 Accordion，关闭时折叠
        accordionValue = useCustomContent ? "item-1" : undefined;
    });
</script>

<div class="flex flex-col h-full">
    <div class="px-6 pt-6">
        <h2 class="text-2xl font-bold tracking-tight">「周报」</h2>
        <p class="text-muted-foreground">一写周报就头大？我来帮你！</p>
    </div>
    <div class="flex flex-col flex-1 p-6 gap-4">
        <div class="flex flex-row justify-between">
            <div class="flex flex-row gap-2">
                <!-- 一键生成周报 -->
                <Button>一键生成</Button>
                <!-- 复制到剪贴板 -->
                <Button>复制到剪贴板</Button>
            </div>
            <!-- 选择周报模板 -->
            <div class="flex flex-row gap-2">
                <Button variant="ghost">自定义内容</Button>
                <Button variant="ghost">修改提示词</Button>
            </div>
        </div>

        <div class="flex flex-col gap-4">
            <Textarea
                bind:value={outputContent}
                readonly
                class="bg-background  shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 h-[200px] max-h-[600px]"
            />
        </div>
    </div>
</div>
