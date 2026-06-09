"use client";

import { ImageOff, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getImageStatusPollDelay,
  resolveClientImageStatus
} from "@/lib/client-image-status";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type FridgeItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  version: number;
  imageStatus: "pending" | "succeeded" | "failed" | null;
  imageUrl: string | null;
  imageErrorCode: string | null;
  imageDeadlineAt: string | null;
};

const EMPTY_FORM = { name: "", quantity: "1", unit: "" };

function normalizeFridgeItems(items: FridgeItem[]) {
  return items.map((item) => ({
    ...item,
    imageStatus: resolveClientImageStatus(item.imageStatus, item.imageDeadlineAt)
  }));
}

function getFridgeImagePollDelay(items: FridgeItem[]) {
  return getImageStatusPollDelay(
    items.map((item) => ({
      status: item.imageStatus,
      deadlineAt: item.imageDeadlineAt
    }))
  );
}

export function FridgeWorkbench() {
  const t = useTranslations("fridge");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FridgeItem | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const data = await requestJson<{ items: FridgeItem[] }>("/api/fridge-items");
      setItems(normalizeFridgeItems(data.items));
      setErrorKey(null);
    } catch (error) {
      setItems((current) => normalizeFridgeItems(current));
      setErrorKey(getErrorTranslationKey(error));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadItems());
  }, [loadItems]);

  useEffect(() => {
    const pollDelay = getFridgeImagePollDelay(items);

    if (pollDelay === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadItems();
    }, pollDelay);

    return () => window.clearTimeout(timeout);
  }, [items, loadItems]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      await requestJson(editingId ? `/api/fridge-items/${editingId}` : "/api/fridge-items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          quantity: Number(form.quantity),
          unit: form.unit
        })
      });
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadItems();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
    }
  }

  function startEditing(item: FridgeItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit
    });
  }

  async function remove(itemId: string) {
    setBusy(true);

    try {
      await requestJson(`/api/fridge-items/${itemId}`, { method: "DELETE" });
      await loadItems();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteItem() {
    if (!pendingDelete) {
      return;
    }

    const itemId = pendingDelete.id;
    setPendingDelete(null);
    await remove(itemId);
  }

  async function retryImage(itemId: string) {
    setBusy(true);

    try {
      await requestJson(`/api/fridge-items/${itemId}/retry-image`, { method: "POST" });
      await loadItems();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn("app-workspace-grid app-fridge-workspace", editingId && "app-fridge-workspace-editing")}
    >
      <section className="app-paper-card app-fridge-inventory-panel">
        {items.length === 0 ? (
          <p className="app-muted-text">{t("empty")}</p>
        ) : (
          <div className="app-fridge-item-list">
            {items.map((item) => (
              <article className="app-fridge-item-row" key={item.id}>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-current/20 bg-white/50">
                  {item.imageUrl ? (
                    <Image
                      alt={item.name}
                      className="h-full w-full object-cover"
                      height={224}
                      src={item.imageUrl}
                      unoptimized
                      width={224}
                    />
                  ) : (
                    <ImageOff className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 opacity-50" />
                  )}
                </div>
                <div className="grid gap-2">
                  <div>
                    <h2 className="app-card-title">{item.name}</h2>
                    <p className="app-muted-text">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="app-muted-text">
                      {t(`imageStatus.${item.imageStatus ?? "notRequested"}`)}
                    </p>
                  </div>
                  <div className="app-action-row app-action-row-compact">
                    <Button
                      className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                      onClick={() => startEditing(item)}
                      type="button"
                      variant="secondary"
                    >
                      <Pencil className="app-button-icon" aria-hidden="true" />
                      <span className="home-paper-button-label">{t("edit")}</span>
                    </Button>
                    {item.imageStatus === "failed" ? (
                      <Button
                        className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                        disabled={busy}
                        onClick={() => retryImage(item.id)}
                        type="button"
                        variant="secondary"
                      >
                        <RefreshCw className="app-button-icon" aria-hidden="true" />
                        <span className="home-paper-button-label">{t("retryImage")}</span>
                      </Button>
                    ) : null}
                    <Button
                      className="home-paper-button app-paper-button-compact app-paper-button-danger"
                      disabled={busy}
                      onClick={() => setPendingDelete(item)}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="app-button-icon" aria-hidden="true" />
                      <span className="home-paper-button-label">{t("delete")}</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="app-fridge-form-panel">
        <h2 className="app-card-title">{editingId ? t("editTitle") : t("addTitle")}</h2>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="app-form-field">
            {t("name")}
            <Input
              className="app-paper-input"
              maxLength={80}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              value={form.name}
            />
          </label>
          <label className="app-form-field">
            {t("quantity")}
            <Input
              className="app-paper-input"
              min="0.001"
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              required
              step="0.001"
              type="number"
              value={form.quantity}
            />
          </label>
          <label className="app-form-field">
            {t("unit")}
            <Input
              className="app-paper-input"
              maxLength={24}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              required
              value={form.unit}
            />
          </label>
          <div className="app-action-row">
            <Button className="home-paper-button app-paper-button-primary" disabled={busy}>
              <Plus className="app-button-icon" aria-hidden="true" />
              <span className="home-paper-button-label">
                {editingId ? t("saveChanges") : t("add")}
              </span>
            </Button>
            {editingId ? (
              <Button
                className="home-paper-button app-paper-button-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                type="button"
                variant="secondary"
              >
                <X className="app-button-icon" aria-hidden="true" />
                <span className="home-paper-button-label">{t("cancel")}</span>
              </Button>
            ) : null}
          </div>
        </form>
        <p className="app-muted-text">{t("mergeNote")}</p>
        {errorKey ? <p className="auth-modal-error">{tErrors(errorKey)}</p> : null}
      </section>
      <ConfirmDeleteDialog
        cancelLabel={t("deleteCancel")}
        confirmLabel={t("deleteConfirm")}
        description={t("deleteDescription", { name: pendingDelete?.name ?? "" })}
        disabled={busy}
        onConfirm={() => void confirmDeleteItem()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        title={t("deleteTitle")}
      />
    </div>
  );
}
