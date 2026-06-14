"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

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

  async function load() {
    const data = await requestJson<{
      key: { hint: string; status: string } | null;
      status: string;
    }>("/api/openai-key");
    setHint(data.key?.hint ?? null);
    setStatus(data.status);
  }

  useEffect(() => {
    queueMicrotask(() => void load().catch((error) => setErrorKey(getErrorTranslationKey(error))));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    }
  }

  async function validate() {
    try {
      await requestJson("/api/openai-key/validate", { method: "POST" });
      setErrorKey(null);
      await load();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    }
  }

  async function remove() {
    try {
      await requestJson("/api/openai-key", { method: "DELETE" });
      setErrorKey(null);
      await load();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    }
  }

  return (
    <form className="app-workbench-surface app-workbench-form app-kitchen-panel" onSubmit={submit}>
      <p className="app-page-description">{t("description")}</p>
      <p className="app-status-sticker">
        {t("currentStatus", { status: t(`status.${status}`), hint: hint ?? t("noHint") })}
      </p>
      <label className="app-form-field">
        {t("fieldLabel")}
        <Input
          autoComplete="off"
          className="app-paper-input"
          name="apiKey"
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={t("placeholder")}
          required
          type="password"
          value={apiKey}
        />
      </label>
      <div className="app-action-row">
        <Button className="home-paper-button app-paper-button-primary">
          <ShieldCheck className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">{t("save")}</span>
        </Button>
        <Button
          className="home-paper-button app-paper-button-compact app-paper-button-secondary"
          onClick={validate}
          type="button"
          variant="secondary"
        >
          <span className="home-paper-button-label">{t("validate")}</span>
        </Button>
        <Button
          className="home-paper-button app-paper-button-compact app-paper-button-danger"
          onClick={remove}
          type="button"
          variant="ghost"
        >
          <Trash2 className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">{t("delete")}</span>
        </Button>
      </div>
      <p className="app-muted-text">{t("imageVerificationNote")}</p>
      {errorKey ? <p className="auth-modal-error">{tErrors(errorKey)}</p> : null}
    </form>
  );
}
