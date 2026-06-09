"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ConfirmDeleteDialog({
  cancelLabel,
  confirmLabel,
  description,
  disabled = false,
  onConfirm,
  onOpenChange,
  open,
  title
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="auth-modal-backdrop app-confirm-dialog-backdrop">
          <Dialog.Content className="auth-modal-card app-confirm-dialog-card">
            <div className="auth-modal-pin" aria-hidden="true" />
            <div className="auth-modal-header">
              <div className="auth-modal-copy">
                <Dialog.Title className="auth-modal-title">{title}</Dialog.Title>
                <Dialog.Description className="auth-modal-description">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button aria-label={cancelLabel} className="auth-modal-close" type="button">
                  <X className="auth-modal-close-icon" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <div className="app-confirm-dialog-actions">
              <Dialog.Close asChild>
                <Button
                  className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                  disabled={disabled}
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
