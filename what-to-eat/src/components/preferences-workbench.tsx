"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

export function PreferencesWorkbench({ locale }: { locale: "zh" | "en" }) {
  const t = useTranslations("preferences");
  const tErrors = useTranslations("errors");
  const [preferenceText, setPreferenceText] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void requestJson<{ preferences: { preferenceText: string } }>("/api/preferences")
      .then((data) => setPreferenceText(data.preferences.preferenceText))
      .catch((error) => setErrorKey(getErrorTranslationKey(error)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    try {
      await requestJson("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, preferenceText })
      });
      setErrorKey(null);
      setSaved(true);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    }
  }

  return (
    <form className="app-workbench-surface app-workbench-form app-kitchen-panel" onSubmit={submit}>
      <p className="app-page-description">{t("description")}</p>
      <label className="app-form-field">
        {t("fieldLabel")}
        <textarea
          className="app-paper-input min-h-40 px-3 py-3"
          maxLength={1000}
          onChange={(event) => setPreferenceText(event.target.value)}
          placeholder={t("placeholder")}
          value={preferenceText}
        />
      </label>
      <div className="app-action-row">
        <Button className="home-paper-button app-paper-button-primary">
          <Save className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">{t("save")}</span>
        </Button>
      </div>
      {saved ? <p className="app-status-sticker">{t("saved")}</p> : null}
      {errorKey ? <p className="auth-modal-error">{tErrors(errorKey)}</p> : null}
    </form>
  );
}
