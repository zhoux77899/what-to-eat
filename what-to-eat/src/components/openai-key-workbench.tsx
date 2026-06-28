"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

export function OpenAiKeyWorkbench() {
  const t = useTranslations("openAiKey");
  const tErrors = useTranslations("errors");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("not_configured");
  const [hint, setHint] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const keyBusy = saving || validating || deleting;

  async function load() {
    const data = await requestJson<{
      key: { hint: string; status: string } | null;
      status: string;
    }>("/api/openai-key");
    setHint(data.key?.hint ?? null);
    setStatus(data.status);
  }

  useEffect(() => {
    queueMicrotask(() =>
      void load()
        .catch((error) => setErrorKey(getErrorTranslationKey(error)))
        .finally(() => setLoaded(true))
    );
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await requestJson("/api/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      });
      setApiKey("");
      setErrorKey(null);
      await load();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setSaving(false);
    }
  }

  async function validate() {
    setValidating(true);
    try {
      await requestJson("/api/openai-key/validate", { method: "POST" });
      setErrorKey(null);
      await load();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setValidating(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await requestJson("/api/openai-key", { method: "DELETE" });
      setErrorKey(null);
      await load();
      setDeleteOpen(false);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form className="app-workbench-surface app-workbench-form app-kitchen-panel" onSubmit={submit}>
      <p className="app-page-description">{t("description")}</p>
      <div className="app-key-status" aria-live="polite">
        <p>
          <strong>{t("statusLabel")}</strong>
          <span>{loaded ? t(`status.${status}`) : t("loading")}</span>
        </p>
        <p>
          <strong>{t("keyHintLabel")}</strong>
          <span>{loaded ? (hint ?? t("noHint")) : t("loading")}</span>
        </p>
      </div>
      <label className="app-form-field">
        {t("fieldLabel")}
        <Input
          autoComplete="off"
          className="app-paper-input"
          name="apiKey"
          disabled={keyBusy}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={t("placeholder")}
          required
          type="password"
          value={apiKey}
        />
      </label>
      <div className="app-action-row">
        <Button
          className="home-paper-button app-paper-button-primary"
          disabled={!loaded || keyBusy || apiKey.trim().length === 0}
        >
          <ShieldCheck className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">
            {saving ? t("saving") : t("save")}
          </span>
        </Button>
        <Button
          className="home-paper-button app-paper-button-compact app-paper-button-secondary"
          disabled={!loaded || keyBusy || status === "not_configured"}
          onClick={validate}
          type="button"
          variant="secondary"
        >
          <span className="home-paper-button-label">
            {validating ? t("validating") : t("validate")}
          </span>
        </Button>
        <Button
          className="home-paper-button app-paper-button-compact app-paper-button-danger"
          disabled={!loaded || keyBusy || hint === null}
          onClick={() => setDeleteOpen(true)}
          type="button"
          variant="ghost"
        >
          <Trash2 className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">{t("delete")}</span>
        </Button>
      </div>
      <p className="app-muted-text">{t("imageVerificationNote")}</p>
      {errorKey ? (
        <p className="auth-modal-error" role="alert">
          {tErrors(errorKey)}
        </p>
      ) : null}
      <ConfirmDeleteDialog
        cancelLabel={t("deleteCancel")}
        confirmLabel={deleting ? t("deleting") : t("deleteConfirm")}
        description={t("deleteDescription")}
        disabled={deleting}
        onConfirm={() => void remove()}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        restoreFocusId="openai-key-page-title"
        title={t("deleteTitle")}
      />
    </form>
  );
}
