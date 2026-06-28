"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

export function PreferencesWorkbench({ locale }: { locale: "zh" | "en" }) {
  const t = useTranslations("preferences");
  const tErrors = useTranslations("errors");
  const [preferenceText, setPreferenceText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const keyboardSubmitRef = useRef(false);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setErrorKey(null);

    try {
      const data = await requestJson<{ preferences: { preferenceText: string } }>(
        "/api/preferences"
      );
      setPreferenceText(data.preferences.preferenceText);
      setSavedText(data.preferences.preferenceText);
    } catch (error) {
      setLoadFailed(true);
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadPreferences());
  }, [loadPreferences]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadFailed) {
      return;
    }

    setSaved(false);
    setSaving(true);

    try {
      await requestJson("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, preferenceText })
      });
      setErrorKey(null);
      setSavedText(preferenceText);
      setSaved(true);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
      if (keyboardSubmitRef.current) {
        window.setTimeout(() => errorRef.current?.focus(), 0);
      }
    } finally {
      setSaving(false);
      keyboardSubmitRef.current = false;
    }
  }

  return (
    <form
      aria-busy={loading}
      aria-label={t("fieldLabel")}
      className="app-workbench-surface app-workbench-form app-kitchen-panel"
      onSubmit={submit}
    >
      <p className="app-page-description">{t("description")}</p>
      <label className="app-form-field">
        {t("fieldLabel")}
        <textarea
          className="app-paper-input min-h-40 px-3 py-3"
          maxLength={1000}
          disabled={loading || loadFailed || saving}
          onChange={(event) => {
            setPreferenceText(event.target.value);
            setSaved(false);
          }}
          placeholder={t("placeholder")}
          value={preferenceText}
        />
      </label>
      <div className="app-action-row">
        {loadFailed ? (
          <Button
            className="home-paper-button app-paper-button-secondary"
            onClick={() => void loadPreferences()}
            type="button"
            variant="secondary"
          >
            {t("retry")}
          </Button>
        ) : null}
        <Button
          className="home-paper-button app-paper-button-primary"
          disabled={loading || loadFailed || saving || preferenceText === savedText}
          onClick={(event) => {
            keyboardSubmitRef.current = event.detail === 0;
          }}
        >
          <Save className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">{saving ? t("saving") : t("save")}</span>
        </Button>
      </div>
      <div aria-live="polite">
        {saved ? <p className="app-status-sticker">{t("saved")}</p> : null}
      </div>
      {errorKey ? (
        <p className="auth-modal-error" ref={errorRef} role="alert" tabIndex={-1}>
          {tErrors(errorKey)}
        </p>
      ) : null}
    </form>
  );
}
