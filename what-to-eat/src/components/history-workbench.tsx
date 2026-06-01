"use client";

import { ImageOff, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

type HistoryDish = {
  id: string;
  name: string;
  summary: string;
  instructions: string[];
  estimatedMinutes: number;
  imageStatus: "pending" | "succeeded" | "failed" | null;
  imageUrl: string | null;
};

type Recommendation = {
  id: string;
  locale: string;
  createdAt: string;
  dishes: HistoryDish[];
};

export function HistoryWorkbench() {
  const t = useTranslations("history");
  const tErrors = useTranslations("errors");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ recommendations: Recommendation[] }>("/api/recommendations");
      setRecommendations(data.recommendations);
      setErrorKey(null);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function retryImage(dishId: string) {
    setBusy(true);

    try {
      await requestJson(`/api/recommendations/${dishId}/retry-image`, { method: "POST" });
      await load();
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
    }
  }

  if (recommendations.length === 0 && !errorKey) {
    return <p className="app-page-description">{t("empty")}</p>;
  }

  return (
    <div className="grid gap-6">
      {errorKey ? <p className="auth-modal-error">{tErrors(errorKey)}</p> : null}
      {recommendations.map((recommendation) => (
        <section className="grid gap-3" key={recommendation.id}>
          <p className="app-muted-text">
            {t("generatedAt", {
              date: new Date(recommendation.createdAt).toLocaleString(recommendation.locale)
            })}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {recommendation.dishes.map((dish) => (
              <article className="app-paper-card grid gap-3 sm:grid-cols-[7rem_1fr]" key={dish.id}>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-current/20 bg-white/50">
                  {dish.imageUrl ? (
                    <Image
                      alt={dish.name}
                      className="h-full w-full object-cover"
                      height={224}
                      src={dish.imageUrl}
                      unoptimized
                      width={224}
                    />
                  ) : (
                    <ImageOff className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 opacity-50" />
                  )}
                </div>
                <div className="grid gap-2">
                  <div>
                    <h2 className="app-card-title">{dish.name}</h2>
                    <p className="app-muted-text">{dish.summary}</p>
                    <p className="app-muted-text">
                      {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
                    </p>
                  </div>
                  {dish.imageStatus === "failed" ? (
                    <Button disabled={busy} onClick={() => retryImage(dish.id)} type="button">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      {t("retryImage")}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
