"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { AppIcon } from "@/components/ui/app-icon";
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

export function HistoryWorkbench({ locale }: { locale: string }) {
  const t = useTranslations("history");
  const tErrors = useTranslations("errors");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [deletingRowIds, setDeletingRowIds] = useState<string[]>([]);
  const [retryingRowIds, setRetryingRowIds] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ recommendations: Recommendation[] }>("/api/recommendations");
      setRecommendations(normalizeRecommendations(data.recommendations));
      setErrorKey(null);
    } catch (error) {
      setRecommendations((current) => normalizeRecommendations(current));
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setLoading(false);
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
    setRetryingRowIds((current) => [...current, dishId]);

    try {
      await requestJson(`/api/recommendations/${dishId}/retry-image`, { method: "POST" });
      await load();
      setRowErrors((current) => {
        const next = { ...current };
        delete next[dishId];
        return next;
      });
    } catch (error) {
      setRowErrors((current) => ({
        ...current,
        [dishId]: getErrorTranslationKey(error)
      }));
    } finally {
      setRetryingRowIds((current) => current.filter((id) => id !== dishId));
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

    setDeletingRowIds((current) => [...current, target.id]);

    try {
      await requestJson(url, { method: "DELETE" });
      setPendingDelete(null);
      await load();
      setRowErrors((current) => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });
    } catch (error) {
      setRowErrors((current) => ({
        ...current,
        [target.id]: getErrorTranslationKey(error)
      }));
    } finally {
      setDeletingRowIds((current) => current.filter((id) => id !== target.id));
    }
  }

  if (loading) {
    return (
      <div className="app-loading-state" role="status">
        <div className="app-skeleton">
          <span>{t("loading")}</span>
          <span className="app-skeleton-line" aria-hidden="true" />
          <span className="app-skeleton-line app-skeleton-line-short" aria-hidden="true" />
        </div>
      </div>
    );
  }

  function recommendationDeleting(recommendationId: string) {
    return deletingRowIds.includes(recommendationId);
  }

  if (recommendations.length === 0 && !errorKey) {
    return (
      <div className="app-empty-state">
        <p>{t("empty")}</p>
        <Link className="home-paper-button app-paper-button-primary" href={`/${locale}/app`}>
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <div className="app-history-timeline">
      {errorKey ? (
        <p className="auth-modal-error" role="alert">
          {tErrors(errorKey)}
        </p>
      ) : null}
      {recommendations.map((recommendation) => (
        <details className="app-history-entry" key={recommendation.id}>
          <AppIcon className="app-history-timeline-marker" name="timeline-marker" />
          <summary className="app-history-entry-summary">
            <span className="app-muted-text">
              {t("generatedAt", {
                date: new Date(recommendation.createdAt).toLocaleString(recommendation.locale)
              })}
            </span>
            <AppIcon className="app-history-entry-chevron" name="chevron-down" />
          </summary>
          <div className="app-history-entry-body">
          <div className="app-history-entry-header app-action-row app-action-row-compact">
            <Button
              className="home-paper-button app-paper-button-compact app-paper-button-danger"
              disabled={deletingRowIds.includes(recommendation.id)}
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
              <AppIcon className="app-button-icon" name="delete" />
              <span className="home-paper-button-label">{t("deleteRecommendation")}</span>
            </Button>
          </div>
          {rowErrors[recommendation.id] ? (
            <p className="auth-modal-error" role="alert">
              {tErrors(rowErrors[recommendation.id])}
            </p>
          ) : null}
          <div className="app-history-dish-list">
            {recommendation.dishes.map((dish) => (
              <article className="app-history-dish-row" key={dish.id}>
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
                    <AppIcon className="app-image-frame-icon" name="image-unavailable" />
                  )}
                </div>
                <div className="grid gap-2">
                  <div>
                    <h2 className="app-card-title">{dish.name}</h2>
                    <p className="app-muted-text">{dish.summary}</p>
                    <p className="app-status-sticker">
                      {t(`imageStatus.${dish.imageStatus ?? "pending"}`)}
                    </p>
                    <p className="app-muted-text">
                      {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
                    </p>
                    <details className="app-dish-details">
                      <summary>{t("viewSteps")}</summary>
                      <ol className="app-instruction-list">
                        {dish.instructions.map((instruction) => (
                          <li key={instruction}>{instruction}</li>
                        ))}
                      </ol>
                    </details>
                  </div>
                  <div className="app-action-row app-action-row-compact">
                    {dish.imageStatus === "failed" ? (
                      <Button
                        className="home-paper-button app-paper-button-compact app-paper-button-secondary"
                        disabled={
                          recommendationDeleting(recommendation.id) ||
                          deletingRowIds.includes(dish.id) ||
                          retryingRowIds.includes(dish.id)
                        }
                        onClick={() => retryImage(dish.id)}
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
                        recommendationDeleting(recommendation.id) ||
                        deletingRowIds.includes(dish.id) ||
                        retryingRowIds.includes(dish.id)
                      }
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
                      <AppIcon className="app-button-icon" name="delete" />
                      <span className="home-paper-button-label">{t("deleteDish")}</span>
                    </Button>
                  </div>
                  {rowErrors[dish.id] ? (
                    <p className="auth-modal-error" role="alert">
                      {tErrors(rowErrors[dish.id])}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          </div>
        </details>
      ))}
      <ConfirmDeleteDialog
        cancelLabel={t("deleteCancel")}
        confirmLabel={t("deleteConfirm")}
        description={
          pendingDelete?.type === "recommendation"
            ? t("deleteRecommendationDescription", { name: pendingDelete.label })
            : t("deleteDishDescription", { name: pendingDelete?.label ?? "" })
        }
        disabled={pendingDelete ? deletingRowIds.includes(pendingDelete.id) : false}
        onConfirm={() => void deletePending()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        restoreFocusId="history-page-title"
        title={
          pendingDelete?.type === "recommendation"
            ? t("deleteRecommendationTitle")
            : t("deleteDishTitle")
        }
      />
    </div>
  );
}
