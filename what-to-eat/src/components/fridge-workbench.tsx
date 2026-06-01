"use client";

import { ImageOff, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

type FridgeItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  version: number;
  imageStatus: "pending" | "succeeded" | "failed" | null;
  imageUrl: string | null;
  imageErrorCode: string | null;
};

const EMPTY_FORM = { name: "", quantity: "1", unit: "" };

export function FridgeWorkbench() {
  const t = useTranslations("fridge");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await requestJson<{ items: FridgeItem[] }>("/api/fridge-items");
      setItems(data.items);
      setErrorKey(null);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadItems());
  }, [loadItems]);

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
    <div className="app-workspace-grid">
      <section className="app-paper-card app-form-card">
        <span className="app-paper-card-pin" aria-hidden="true" />
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>
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

      <section className="grid gap-4">
        {items.length === 0 ? (
          <div className="app-paper-card app-empty-card">
            <p className="app-muted-text">{t("empty")}</p>
          </div>
        ) : (
          items.map((item) => (
            <article className="app-paper-card grid gap-4 sm:grid-cols-[7rem_1fr]" key={item.id}>
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
                <div className="app-action-row">
                  <Button onClick={() => startEditing(item)} type="button" variant="secondary">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {t("edit")}
                  </Button>
                  {item.imageStatus === "failed" ? (
                    <Button disabled={busy} onClick={() => retryImage(item.id)} type="button">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      {t("retryImage")}
                    </Button>
                  ) : null}
                  <Button disabled={busy} onClick={() => remove(item.id)} type="button" variant="ghost">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t("delete")}
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
