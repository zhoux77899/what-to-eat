"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { AppIcon } from "@/components/ui/app-icon";
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
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemIds, setDeletingItemIds] = useState<string[]>([]);
  const [retryingItemIds, setRetryingItemIds] = useState<string[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FridgeItem | null>(null);
  const itemRowRefs = useRef(new Map<string, HTMLElement>());
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savingOperationRef = useRef(false);
  const savingItemIdRef = useRef<string | null>(null);
  const editingItemBusy = editingId !== null && retryingItemIds.includes(editingId);

  const loadItems = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await requestJson<{ items: FridgeItem[] }>("/api/fridge-items");
      setItems(normalizeFridgeItems(data.items));
      setErrorKey(null);
      setLoadFailed(false);
    } catch (error) {
      setItems((current) => normalizeFridgeItems(current));
      setErrorKey(getErrorTranslationKey(error));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadItems(true));
  }, [loadItems]);

  useEffect(() => {
    if (editingId) nameInputRef.current?.focus();
  }, [editingId]);

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
    if (editingItemBusy || savingOperationRef.current) return;
    const savedItemId = editingId;
    savingOperationRef.current = true;
    savingItemIdRef.current = savedItemId;
    setSavingItemId(savedItemId);
    setSaving(true);

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
      if (savedItemId) {
        window.setTimeout(() => itemRowRefs.current.get(savedItemId)?.focus(), 0);
      }
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      savingOperationRef.current = false;
      savingItemIdRef.current = null;
      setSavingItemId(null);
      setSaving(false);
    }
  }

  function startEditing(item: FridgeItem) {
    if (
      savingOperationRef.current ||
      retryingItemIds.includes(item.id) ||
      deletingItemIds.includes(item.id)
    ) {
      return;
    }
    setEditingId(item.id);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit
    });
  }

  async function remove(itemId: string) {
    if (
      editingId === itemId ||
      savingItemIdRef.current === itemId ||
      deletingItemIds.includes(itemId) ||
      retryingItemIds.includes(itemId)
    ) {
      return false;
    }
    setDeletingItemIds((current) => [...current, itemId]);

    try {
      await requestJson(`/api/fridge-items/${itemId}`, { method: "DELETE" });
      await loadItems();
      setItemErrors((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      return true;
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [itemId]: getErrorTranslationKey(error)
      }));
      return false;
    } finally {
      setDeletingItemIds((current) => current.filter((id) => id !== itemId));
    }
  }

  async function confirmDeleteItem() {
    if (!pendingDelete) {
      return;
    }

    if (await remove(pendingDelete.id)) {
      setPendingDelete(null);
    }
  }

  async function retryImage(itemId: string) {
    if (
      editingId === itemId ||
      savingItemIdRef.current === itemId ||
      retryingItemIds.includes(itemId) ||
      deletingItemIds.includes(itemId)
    ) {
      return;
    }
    setRetryingItemIds((current) => [...current, itemId]);

    try {
      await requestJson(`/api/fridge-items/${itemId}/retry-image`, { method: "POST" });
      await loadItems();
      setItemErrors((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [itemId]: getErrorTranslationKey(error)
      }));
    } finally {
      setRetryingItemIds((current) => current.filter((id) => id !== itemId));
    }
  }

  return (
    <div
      className={cn("app-workspace-grid app-fridge-workspace", editingId && "app-fridge-workspace-editing")}
    >
      <section className="app-recipe-card app-fridge-inventory-panel">
        {loading ? (
          <div className="app-loading-state" role="status">
            <div className="app-skeleton">
              <span>{t("loading")}</span>
              <span className="app-skeleton-line" aria-hidden="true" />
              <span className="app-skeleton-line app-skeleton-line-short" aria-hidden="true" />
            </div>
          </div>
        ) : loadFailed && items.length === 0 ? (
          <div className="app-empty-state" role="alert">
            <p>{errorKey ? tErrors(errorKey) : null}</p>
            <Button
              className="home-paper-button app-paper-button-secondary"
              onClick={() => void loadItems(true)}
              type="button"
              variant="secondary"
            >
              {t("retryLoad")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="app-empty-state">{t("empty")}</p>
        ) : (
          <div className="app-fridge-item-list">
            {items.map((item) => (
              <article
                className="app-fridge-item-row"
                key={item.id}
                ref={(element) => {
                  if (element) itemRowRefs.current.set(item.id, element);
                  else itemRowRefs.current.delete(item.id);
                }}
                tabIndex={-1}
              >
                <div className="app-image-frame app-fridge-image-frame">
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
                    <AppIcon className="app-image-frame-icon" name="image-unavailable" />
                  )}
                </div>
                <div className="grid gap-2">
                  <div>
                    <h2 className="app-card-title">{item.name}</h2>
                    <p className="app-muted-text">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="app-status-sticker">
                      {t(`imageStatus.${item.imageStatus ?? "notRequested"}`)}
                    </p>
                  </div>
                  <div className="app-action-row app-action-row-compact">
                    <Button
                      className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                      disabled={
                        saving ||
                        deletingItemIds.includes(item.id) || retryingItemIds.includes(item.id)
                      }
                      onClick={() => startEditing(item)}
                      type="button"
                      variant="secondary"
                    >
                      <AppIcon className="app-button-icon" name="edit" />
                      <span className="home-paper-button-label">{t("edit")}</span>
                    </Button>
                    {item.imageStatus === "failed" ? (
                      <Button
                        className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                        disabled={
                          deletingItemIds.includes(item.id) ||
                          retryingItemIds.includes(item.id) ||
                          savingItemId === item.id ||
                          editingId === item.id
                        }
                        onClick={() => retryImage(item.id)}
                        type="button"
                        variant="secondary"
                      >
                        <AppIcon className="app-button-icon" name="retry" />
                        <span className="home-paper-button-label">{t("retryImage")}</span>
                      </Button>
                    ) : null}
                    <Button
                      className="home-paper-button app-paper-button-compact app-paper-button-danger"
                      disabled={
                        editingId === item.id ||
                        savingItemId === item.id ||
                        deletingItemIds.includes(item.id) ||
                        retryingItemIds.includes(item.id)
                      }
                      onClick={() => setPendingDelete(item)}
                      type="button"
                      variant="ghost"
                    >
                      <AppIcon className="app-button-icon" name="delete" />
                      <span className="home-paper-button-label">{t("delete")}</span>
                    </Button>
                  </div>
                  {itemErrors[item.id] ? (
                    <p className="auth-modal-error" role="alert">
                      {tErrors(itemErrors[item.id])}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="app-fridge-form-panel app-kitchen-panel">
        <h2 className="app-card-title">{editingId ? t("editTitle") : t("addTitle")}</h2>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="app-form-field">
            {t("name")}
            <Input
              className="app-paper-input"
              disabled={saving || editingItemBusy}
              maxLength={80}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              ref={nameInputRef}
              value={form.name}
            />
          </label>
          <label className="app-form-field">
            {t("quantity")}
            <Input
              className="app-paper-input"
              disabled={saving || editingItemBusy}
              min="1"
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              required
              step="1"
              type="number"
              value={form.quantity}
            />
          </label>
          <label className="app-form-field">
            {t("unit")}
            <Input
              className="app-paper-input"
              disabled={saving || editingItemBusy}
              maxLength={24}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              required
              value={form.unit}
            />
          </label>
          <div className="app-action-row">
            <Button
              className="home-paper-button app-paper-button-primary"
              disabled={saving || editingItemBusy}
            >
              <AppIcon className="app-button-icon" name="add" />
              <span className="home-paper-button-label">
                {editingId ? t("saveChanges") : t("add")}
              </span>
            </Button>
            {editingId ? (
              <Button
                className="home-paper-button app-paper-button-secondary"
                disabled={saving}
                onClick={() => {
                  if (savingOperationRef.current) return;
                  const cancelledItemId = editingId;
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  window.setTimeout(
                    () => cancelledItemId && itemRowRefs.current.get(cancelledItemId)?.focus(),
                    0
                  );
                }}
                type="button"
                variant="secondary"
              >
                <AppIcon className="app-button-icon" name="close" />
                <span className="home-paper-button-label">{t("cancel")}</span>
              </Button>
            ) : null}
          </div>
        </form>
        <p className="app-muted-text">{t("mergeNote")}</p>
        {errorKey && !(loadFailed && items.length === 0) ? (
          <p className="auth-modal-error" role="alert">
            {tErrors(errorKey)}
          </p>
        ) : null}
      </section>
      <ConfirmDeleteDialog
        cancelLabel={t("deleteCancel")}
        confirmLabel={t("deleteConfirm")}
        description={t("deleteDescription", { name: pendingDelete?.name ?? "" })}
        disabled={pendingDelete ? deletingItemIds.includes(pendingDelete.id) : false}
        onConfirm={() => void confirmDeleteItem()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        restoreFocusId="fridge-page-title"
        title={t("deleteTitle")}
      />
    </div>
  );
}
