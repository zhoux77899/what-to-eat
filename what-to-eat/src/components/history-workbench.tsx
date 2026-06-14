"use client";

import { ImageOff, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  getImageStatusPollDelay,
  resolveClientImageStatus
} from "@/lib/client-image-status";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

type HistoryDish = {
  id: string;
  name: string;
  summary: string;
  instructions: string[];
  estimatedMinutes: number;
  imageStatus: "pending" | "succeeded" | "failed" | null;
  imageUrl: string | null;
  imageDeadlineAt: string | null;
};

type Recommendation = {
  id: string;
  locale: string;
  createdAt: string;
  dishes: HistoryDish[];
};

type PendingDelete =
  | {
      id: string;
      label: string;
      type: "recommendation";
    }
  | {
      id: string;
      label: string;
      type: "dish";
    };

function normalizeRecommendations(recommendations: Recommendation[]) {
  return recommendations.map((recommendation) => ({
    ...recommendation,
    dishes: recommendation.dishes.map((dish) => ({
      ...dish,
      imageStatus: resolveClientImageStatus(dish.imageStatus, dish.imageDeadlineAt)
    }))
  }));
}

function getHistoryImagePollDelay(recommendations: Recommendation[]) {
  return getImageStatusPollDelay(
    recommendations.flatMap((recommendation) =>
      recommendation.dishes.map((dish) => ({
        status: dish.imageStatus,
        deadlineAt: dish.imageDeadlineAt
      }))
    )
  );
}

export function HistoryWorkbench() {
  const t = useTranslations("history");
  const tErrors = useTranslations("errors");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ recommendations: Recommendation[] }>("/api/recommendations");
      setRecommendations(normalizeRecommendations(data.recommendations));
      setErrorKey(null);
    } catch (error) {
      setRecommendations((current) => normalizeRecommendations(current));
      setErrorKey(getErrorTranslationKey(error));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const pollDelay = getHistoryImagePollDelay(recommendations);

    if (pollDelay === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void load();
    }, pollDelay);

    return () => window.clearTimeout(timeout);
  }, [recommendations, load]);

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

  async function deletePending() {
    if (!pendingDelete) {
      return;
    }

    const target = pendingDelete;
    const url =
      target.type === "recommendation"
        ? `/api/recommendations/${target.id}`
        : `/api/recommendations/dishes/${target.id}`;

    setBusy(true);

    try {
      await requestJson(url, { method: "DELETE" });
      setPendingDelete(null);
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
          <div className="app-action-row app-action-row-compact">
            <p className="app-muted-text">
              {t("generatedAt", {
                date: new Date(recommendation.createdAt).toLocaleString(recommendation.locale)
              })}
            </p>
            <Button
              className="home-paper-button app-paper-button-compact app-paper-button-danger"
              disabled={busy}
              onClick={() =>
                setPendingDelete({
                  id: recommendation.id,
                  label: new Date(recommendation.createdAt).toLocaleString(recommendation.locale),
                  type: "recommendation"
                })
              }
              type="button"
              variant="ghost"
            >
              <Trash2 className="app-button-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("deleteRecommendation")}</span>
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {recommendation.dishes.map((dish) => (
              <article className="app-recipe-card app-history-dish-card" key={dish.id}>
                <div className="app-image-frame app-history-image-frame">
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
                    <ImageOff className="app-image-frame-icon" />
                  )}
                </div>
                <div className="grid gap-2">
                  <div>
                    <h2 className="app-card-title">{dish.name}</h2>
                    <p className="app-muted-text">{dish.summary}</p>
                    <p className="app-status-sticker">
                      {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
                    </p>
                  </div>
                  <div className="app-action-row app-action-row-compact">
                    {dish.imageStatus === "failed" ? (
                      <Button
                        className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                        disabled={busy}
                        onClick={() => retryImage(dish.id)}
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
                      onClick={() =>
                        setPendingDelete({
                          id: dish.id,
                          label: dish.name,
                          type: "dish"
                        })
                      }
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="app-button-icon" aria-hidden="true" />
                      <span className="home-paper-button-label">{t("deleteDish")}</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      <ConfirmDeleteDialog
        cancelLabel={t("deleteCancel")}
        confirmLabel={t("deleteConfirm")}
        description={
          pendingDelete?.type === "recommendation"
            ? t("deleteRecommendationDescription", { name: pendingDelete.label })
            : t("deleteDishDescription", { name: pendingDelete?.label ?? "" })
        }
        disabled={busy}
        onConfirm={() => void deletePending()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        title={
          pendingDelete?.type === "recommendation"
            ? t("deleteRecommendationTitle")
            : t("deleteDishTitle")
        }
      />
    </div>
  );
}
