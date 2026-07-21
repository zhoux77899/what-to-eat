"use client";

import * as Dialog from "@radix-ui/react-dialog";

import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  descriptionRole?: "alert" | "status";
  disabled?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  restoreFocusId?: string;
  title: string;
};

export function ConfirmDeleteDialog({
  cancelLabel,
  confirmLabel,
  description,
  descriptionRole,
  disabled = false,
  onConfirm,
  onOpenChange,
  open,
  restoreFocusId,
  title
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="auth-modal-backdrop app-confirm-dialog-backdrop">
          <Dialog.Content
            className="auth-modal-card app-confirm-dialog-card"
            onCloseAutoFocus={(event) => {
              if (!restoreFocusId) return;
              const target = document.getElementById(restoreFocusId);
              if (!target) return;
              event.preventDefault();
              target.focus();
            }}
          >
            <div className="auth-modal-pin" aria-hidden="true" />
            <div className="auth-modal-header">
              <div className="auth-modal-copy">
                <Dialog.Title className="auth-modal-title">{title}</Dialog.Title>
                <Dialog.Description className="auth-modal-description" role={descriptionRole}>
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label={cancelLabel}
                  className="auth-modal-close"
                  type="button"
                >
                  <AppIcon className="auth-modal-close-icon" name="close" />
                </button>
              </Dialog.Close>
            </div>
            <div className="app-confirm-dialog-actions">
              <Dialog.Close asChild>
                <Button
                  className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                  type="button"
                  variant="secondary"
                >
                  <span className="home-paper-button-label">{cancelLabel}</span>
                </Button>
              </Dialog.Close>
              <Button
                className="home-paper-button app-paper-button-compact app-paper-button-danger"
                disabled={disabled}
                onClick={onConfirm}
                type="button"
                variant="ghost"
              >
                <span className="home-paper-button-label">{confirmLabel}</span>
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
