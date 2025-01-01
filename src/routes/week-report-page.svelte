<script lang="ts">
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";
    import { OpenAIClient } from "$src/features/openai";
    import { writeText } from "@tauri-apps/plugin-clipboard-manager";
    import { ClipboardCopy, LoaderCircle, Sparkles } from "lucide-svelte";
    import { onMount } from "svelte";
    import { _ } from "svelte-i18n";

    import {
        SETTING_KEY_AI_API_KEY,
        SETTING_KEY_AI_BASE_URL,
        SETTING_KEY_AI_MODEL_ID,
        SETTING_KEY_AI_WORK_REPORT_PROMPT,
    } from "$src/config";
    import { getKV, getMattersByRange, setKV, type Matter } from "$src/store";
    import dayjs from "dayjs";
    import { v4 as uuidv4 } from "uuid";
    let outputContent = $state("");
    let customContent = $state("");
    let promptContent = $state("");
    let showCustomDialog = $state(false);
    let showPromptDialog = $state(false);

    let aiLoading = $state(false);
    let copyLoading = $state(false);

    let textareaElement = $state<HTMLTextAreaElement | null>(null);

    let isInitialized = $state(false);
    $effect(() => {
        if (isInitialized && promptContent !== undefined) {
            setKV(SETTING_KEY_AI_WORK_REPORT_PROMPT, promptContent);
        }
    });

    function handleTextareaInput(e: Event) {
        const textarea = e.target as HTMLTextAreaElement;
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 600);
        textarea.style.height = newHeight + "px";
        textarea.scrollTop = textarea.scrollHeight;
    }

    $effect(() => {
        if (outputContent) {
            setTimeout(() => {
                const textarea = document.querySelector("textarea");
                if (textarea) {
                    const event = new Event("input");
                    Object.defineProperty(event, "target", { value: textarea });
                    handleTextareaInput(event);
                }
            }, 0);
        }
    });

    async function handleCopy() {
        if (outputContent.length === 0) {
            return;
        }
        copyLoading = true;
        await writeText(outputContent);
        setTimeout(() => {
            copyLoading = false;
        }, 250);
    }

    function handleCustomContentSubmit() {
        showCustomDialog = false;
    }

    function handlePromptSubmit() {
        showPromptDialog = false;
    }

    async function handleGenerate() {
        aiLoading = true;
        let apikey = await getKV(SETTING_KEY_AI_API_KEY);
        let model = await getKV(SETTING_KEY_AI_MODEL_ID);
        let baseUrl = await getKV(SETTING_KEY_AI_BASE_URL);
        let client = new OpenAIClient({
            apiKey: apikey,
            baseURL: baseUrl,
            defaultModel: model,
        });

        let systemPrompt = `
你是一位经验丰富的数据分析师和报告撰写专家，擅长将复杂的数据信息转化为清晰、有条理的报告文档。
根据用户提供的数据，生成一份结构清晰、内容丰富的周报，包括工作总结、关键成就和待解决的问题。
报告应保持客观性和准确性，不得包含任何主观臆断或不实信息。报告格式应符合专业标准，语言简洁明了。
`;
        let conversationId = uuidv4();
        client.setSystemPrompt(conversationId, systemPrompt);
        let content = "";
        if (customContent.length > 0) {
            content = customContent;
        } else {
            const start = dayjs().startOf("day").subtract(1, "week").toISOString();
            const end = dayjs().endOf("day").toISOString();
            let list = await getMattersByRange(start, end);
            content += "最近一周的任务:\n";
            if (list.length > 0) {
                content += "```csv\n";
                content += ["开始时间", "结束时间", "标题", "标签"].join(" | ") + "\n";
                list.forEach((item: Matter) => {
                    content += `${new Date(item.start_time).toLocaleString()} | ${new Date(
                        item.end_time
                    ).toLocaleString()} | ${item.title} | ${item.tags ?? ""}\n`;
                });
                content += "```\n";
            } else {
                content += "无任务。（最近一周没有安排任务）\n";
            }
        }
        try {
            outputContent = "";
            await client.sendMessage(conversationId, content, {
                stream: true,
                streamCallbacks: {
                    onMessage: (message) => {
                        outputContent += message;
                    },
                },
            });
        } catch (error) {
            console.error("Error generating title:", error);
        } finally {
            aiLoading = false;
        }
    }

    onMount(async () => {
        promptContent = (await getKV(SETTING_KEY_AI_WORK_REPORT_PROMPT)) ?? "";
        isInitialized = true;
    });
</script>

<div class="flex flex-col h-full">
    <div class="px-6 pt-6">
        <h2 class="text-2xl font-bold tracking-tight">{$_("app.week_report.title")}</h2>
        <p class="text-muted-foreground">{$_("app.week_report.description")}</p>
    </div>
    <div class="flex flex-col flex-1 p-6 gap-4">
        <div class="flex flex-row justify-between">
            <div class="flex flex-row gap-2">
                <Button onclick={handleGenerate}>
                    {#if aiLoading}
                        <LoaderCircle class="animate-spin" />
                    {:else}
                        <Sparkles />
                    {/if}
                    {$_("app.week_report.generate_button")}
                </Button>
                <Button onclick={handleCopy}>
                    {#if copyLoading}
                        <LoaderCircle class="animate-spin" />
                    {:else}
                        <ClipboardCopy />
                    {/if}
                    {$_("app.week_report.copy_button")}
                </Button>
            </div>
            <div class="flex flex-row gap-2">
                <Button
                    variant={customContent.length > 0 ? "default" : "ghost"}
                    onclick={() => (showCustomDialog = true)}>{$_("app.week_report.custom_content_button")}</Button
                >
                <Button
                    variant={promptContent.length > 0 ? "default" : "ghost"}
                    onclick={() => (showPromptDialog = true)}>{$_("app.week_report.modify_prompt_button")}</Button
                >
            </div>
        </div>

        <div class="flex flex-col gap-4">
            <Textarea
                bind:value={outputContent}
                readonly
                oninput={handleTextareaInput}
                class="bg-background shadow-none font-normal focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[200px] resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            />
        </div>
    </div>
</div>

<AlertDialog.Root bind:open={showCustomDialog}>
    <AlertDialog.Overlay class="bg-[#000000]/20" />
    <AlertDialog.Content class="w-[640px] max-w-[640px]">
        <AlertDialog.Header>
            <AlertDialog.Title>{$_("app.week_report.custom_content_title")}</AlertDialog.Title>
        </AlertDialog.Header>
        <div class="grid gap-4 py-4">
            <Textarea bind:value={customContent} class="bg-background min-h-[200px]" />
        </div>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>取消</AlertDialog.Cancel>
            <AlertDialog.Action onclick={handleCustomContentSubmit}>确定</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={showPromptDialog}>
    <AlertDialog.Overlay class="bg-[#000000]/20" />
    <AlertDialog.Content class="w-[640px] max-w-[640px]">
        <AlertDialog.Header>
            <AlertDialog.Title>{$_("app.week_report.modify_prompt_title")}</AlertDialog.Title>
        </AlertDialog.Header>
        <div class="grid gap-4 py-4">
            <Textarea bind:value={promptContent} class="bg-background min-h-[200px]" />
        </div>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>取消</AlertDialog.Cancel>
            <AlertDialog.Action onclick={handlePromptSubmit}>确定</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
