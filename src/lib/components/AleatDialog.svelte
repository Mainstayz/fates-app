<script lang="ts">
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    let {
        open = $bindable(),
        title,
        content,
        cancelText = "取消",
        confirmText = "确认",
        showCancel = true,
        onConfirm = () => {},
    } = $props();
</script>

<AlertDialog.Root bind:open>
    <AlertDialog.Portal>
        <AlertDialog.Overlay class="bg-[#000000]/20" />
        <AlertDialog.Content trapFocus={false} interactOutsideBehavior="ignore">
            <AlertDialog.Header>
                <AlertDialog.Title>{title}</AlertDialog.Title>
                <AlertDialog.Description>{content}</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
                {#if showCancel}
                    <AlertDialog.Cancel>{cancelText}</AlertDialog.Cancel>
                {/if}
                <AlertDialog.Action
                    onclick={() => {
                        open = false;
                        onConfirm();
                    }}
                >
                    {confirmText}
                </AlertDialog.Action>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Portal>
</AlertDialog.Root>
