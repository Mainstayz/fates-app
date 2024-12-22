<script lang="ts">
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    import { t } from "svelte-i18n";
    let {
        open = $bindable(),
        title,
        content,
        cancelText = "",
        confirmText = "",
        showCancel = true,
        onConfirm = () => {},
    } = $props();

    if (cancelText.length == 0) {
        cancelText = $t("app.other.cancel");
    }
    if (confirmText.length == 0) {
        confirmText = $t("app.other.confirm");
    }
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
