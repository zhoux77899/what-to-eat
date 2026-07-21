"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import {
  getImageStatusPollDelay,
  resolveClientImageStatus
} from "@/lib/client-image-status";
import { getErrorTranslationKey, requestJson } from "@/lib/api-client";

type Consumption = {
  fridgeItemId: string;
  fridgeItemName: string;
  expectedVersion: number;
  consumedQuantity: number;
  unit: string;
};

type Dish = {
  id: string;
  name: string;
  summary: string;
  instructions: string[];
  estimatedMinutes: number;
  consumptions: Consumption[];
  image: {
    status: "pending" | "succeeded" | "failed";
    publicUrl: string | null;
    deadlineAt: string | null;
  };
};

type RecommendationResponse = {
  dishes: Dish[];
};

type RecommendationImageDish = {
  id: string;
  imageStatus: "pending" | "succeeded" | "failed" | null;
  imageUrl: string | null;
  imageDeadlineAt: string | null;
};

type RecommendationImageResponse = {
  recommendations: {
    dishes: RecommendationImageDish[];
  }[];
};

function normalizeDishes(dishes: Dish[]) {
  return dishes.map((dish) => ({
    ...dish,
    image: {
      ...dish.image,
      status: resolveClientImageStatus(dish.image.status, dish.image.deadlineAt) ?? "failed"
    }
  }));
}

function getDishImagePollDelay(dishes: Dish[]) {
  return getImageStatusPollDelay(
    dishes.map((dish) => ({
      status: dish.image.status,
      deadlineAt: dish.image.deadlineAt
    }))
  );
}

export function RecommendWorkbench() {
  const t = useTranslations("recommend");
  const tErrors = useTranslations("errors");
  const [candidateCount, setCandidateCount] = useState("3");
  const [temporaryRequirement, setTemporaryRequirement] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [confirmedDishIds, setConfirmedDishIds] = useState<string[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmingDishIds, setConfirmingDishIds] = useState<string[]>([]);
  const [retryingDishIds, setRetryingDishIds] = useState<string[]>([]);
  const [dishErrors, setDishErrors] = useState<Record<string, string>>({});
  const [pendingConsumptionDish, setPendingConsumptionDish] = useState<Dish | null>(null);
  const generationInFlightRef = useRef(false);
  const confirmationInFlightRef = useRef(new Set<string>());
  const recommendInteractionBusy = generating || confirmingDishIds.length > 0;

  const loadDishImages = useCallback(async () => {
    try {
      const data = await requestJson<RecommendationImageResponse>("/api/recommendations");
      const imageByDishId = new Map<string, Dish["image"]>();

      for (const recommendation of data.recommendations) {
        for (const dish of recommendation.dishes) {
          imageByDishId.set(dish.id, {
            status: dish.imageStatus ?? "failed",
            publicUrl: dish.imageUrl,
            deadlineAt: dish.imageDeadlineAt
          });
        }
      }

      setDishes((current) =>
        normalizeDishes(
          current.map((dish) => ({
            ...dish,
            image: imageByDishId.get(dish.id) ?? dish.image
          }))
        )
      );
      setErrorKey(null);
    } catch (error) {
      setDishes((current) => normalizeDishes(current));
      setErrorKey(getErrorTranslationKey(error));
    }
  }, []);

  useEffect(() => {
    const pollDelay = getDishImagePollDelay(dishes);

    if (pollDelay === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadDishImages();
    }, pollDelay);

    return () => window.clearTimeout(timeout);
  }, [dishes, loadDishImages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generationInFlightRef.current || confirmationInFlightRef.current.size > 0) return;
    generationInFlightRef.current = true;
    setGenerating(true);

    try {
      const result = await requestJson<RecommendationResponse>("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateCount: Number(candidateCount),
          temporaryRequirement: temporaryRequirement.trim() || null
        })
      });
      setDishes(normalizeDishes(result.dishes));
      setConfirmedDishIds([]);
      setErrorKey(null);
      setDishErrors({});
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      generationInFlightRef.current = false;
      setGenerating(false);
    }
  }

  function updateConsumption(dishId: string, fridgeItemId: string, consumedQuantity: number) {
    setDishes((current) =>
      current.map((dish) =>
        dish.id === dishId
          ? {
              ...dish,
              consumptions: dish.consumptions.map((consumption) =>
                consumption.fridgeItemId === fridgeItemId
                  ? { ...consumption, consumedQuantity }
                  : consumption
              )
            }
          : dish
      )
    );
  }

  function adjustConsumption(dishId: string, fridgeItemId: string, delta: number) {
    setDishes((current) =>
      current.map((dish) =>
        dish.id === dishId
          ? {
              ...dish,
              consumptions: dish.consumptions.map((consumption) =>
                consumption.fridgeItemId === fridgeItemId
                  ? {
                      ...consumption,
                      consumedQuantity: Math.max(
                        0.001,
                        Number((consumption.consumedQuantity + delta).toFixed(3))
                      )
                    }
                  : consumption
              )
            }
          : dish
      )
    );
  }

  async function confirm(dish: Dish) {
    if (generationInFlightRef.current || confirmationInFlightRef.current.has(dish.id)) return;
    confirmationInFlightRef.current.add(dish.id);
    setConfirmingDishIds((current) => [...current, dish.id]);

    try {
      await requestJson("/api/fridge-items/apply-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumptions: dish.consumptions })
      });
      setConfirmedDishIds((current) => [...current, dish.id]);
      setPendingConsumptionDish((current) => (current?.id === dish.id ? null : current));
      setDishErrors((current) => {
        const next = { ...current };
        delete next[dish.id];
        return next;
      });
    } catch (error) {
      setDishErrors((current) => ({
        ...current,
        [dish.id]: getErrorTranslationKey(error)
      }));
    } finally {
      confirmationInFlightRef.current.delete(dish.id);
      setConfirmingDishIds((current) => current.filter((id) => id !== dish.id));
    }
  }

  async function retryImage(dishId: string) {
    setRetryingDishIds((current) => [...current, dishId]);

    try {
      await requestJson(`/api/recommendations/${dishId}/retry-image`, { method: "POST" });
      setDishes((current) =>
        current.map((dish) =>
          dish.id === dishId
            ? { ...dish, image: { ...dish.image, publicUrl: null, status: "pending" } }
            : dish
        )
      );
      setDishErrors((current) => {
        const next = { ...current };
        delete next[dishId];
        return next;
      });
    } catch (error) {
      setDishErrors((current) => ({
        ...current,
        [dishId]: getErrorTranslationKey(error)
      }));
    } finally {
      setRetryingDishIds((current) => current.filter((id) => id !== dishId));
    }
  }

  return (
    <div className="app-workspace-grid app-recommend-workspace app-recommend-workbench">
      <RecommendationRequestStrip
        busy={recommendInteractionBusy}
        candidateCount={candidateCount}
        errorKey={errorKey}
        onCandidateCountChange={setCandidateCount}
        onSubmit={submit}
        onTemporaryRequirementChange={setTemporaryRequirement}
        temporaryRequirement={temporaryRequirement}
      />

      {dishes.length > 0 ? (
        <section className="app-recommend-results">
          <div className="app-recommend-results-ribbon">
            <span>{t("resultsTitle")}</span>
          </div>
          <div className="app-recommend-dish-grid">
            {dishes.map((dish) => (
              <DishRecommendationCard
                busy={generating || confirmingDishIds.includes(dish.id)}
                confirmed={confirmedDishIds.includes(dish.id)}
                dish={dish}
                errorKey={dishErrors[dish.id] ?? null}
                key={dish.id}
                onAdjustConsumption={adjustConsumption}
                onConfirm={setPendingConsumptionDish}
                onConsumptionChange={updateConsumption}
                onRetryImage={retryImage}
                retryingImage={retryingDishIds.includes(dish.id)}
              />
            ))}
          </div>
          <p className="app-recommend-tip">
            <AppIcon className="app-inline-icon" name="tip" />
            <span>{t("confirmationTip")}</span>
          </p>
        </section>
      ) : generating ? (
        <section className="app-recommend-results app-recommend-skeleton" role="status">
          <span>{t("generating")}</span>
          <div className="app-recommend-dish-grid" aria-hidden="true">
            {[0, 1].map((item) => (
              <div className="app-recipe-card app-skeleton" key={item}>
                <span className="app-skeleton-line" />
                <span className="app-skeleton-line app-skeleton-line-short" />
                <span className="app-skeleton-line" />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <ConfirmDeleteDialog
        cancelLabel={t("confirmConsumptionCancel")}
        confirmLabel={t("confirmConsumptionAction")}
        description={
          pendingConsumptionDish
            ? dishErrors[pendingConsumptionDish.id]
              ? `${t("confirmConsumptionDescription", {
                  name: pendingConsumptionDish.name
                })} ${tErrors(dishErrors[pendingConsumptionDish.id])}`
              : t("confirmConsumptionDescription", { name: pendingConsumptionDish.name })
            : ""
        }
        descriptionRole={
          pendingConsumptionDish && dishErrors[pendingConsumptionDish.id] ? "alert" : undefined
        }
        disabled={
          pendingConsumptionDish
            ? confirmingDishIds.includes(pendingConsumptionDish.id)
            : false
        }
        onConfirm={() => {
          if (pendingConsumptionDish) void confirm(pendingConsumptionDish);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingConsumptionDish(null);
        }}
        open={pendingConsumptionDish !== null}
        restoreFocusId="recommend-page-title"
        title={t("confirmConsumptionTitle")}
      />
    </div>
  );
}

function RecommendationRequestStrip({
  busy,
  candidateCount,
  errorKey,
  onCandidateCountChange,
  onSubmit,
  onTemporaryRequirementChange,
  temporaryRequirement
}: {
  busy: boolean;
  candidateCount: string;
  errorKey: string | null;
  onCandidateCountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTemporaryRequirementChange: (value: string) => void;
  temporaryRequirement: string;
}) {
  const t = useTranslations("recommend");
  const tErrors = useTranslations("errors");
  const candidateCountValue = Number(candidateCount);

  const changeCandidateCount = (delta: number) => {
    onCandidateCountChange(String(Math.min(5, Math.max(1, candidateCountValue + delta))));
  };

  return (
    <form className="app-recommend-request-strip" onSubmit={onSubmit}>
      <label className="app-form-field app-recommend-prompt-field">
        <span className="app-request-label">{t("formTitle")}</span>
        <textarea
          className="app-paper-input app-request-input"
          maxLength={500}
          onChange={(event) => onTemporaryRequirementChange(event.target.value)}
          placeholder={t("temporaryRequirementPlaceholder")}
          value={temporaryRequirement}
        />
      </label>
      <div className="app-form-field app-candidate-count-field">
        <span className="app-request-label">{t("candidateCount")}</span>
        <div className="app-candidate-count-stepper">
          <button
            aria-label={t("decreaseCandidateCount")}
            className="app-stepper-button"
            disabled={busy || candidateCountValue <= 1}
            onClick={() => changeCandidateCount(-1)}
            type="button"
          >
            <AppIcon name="minus" />
          </button>
          <output className="app-candidate-count-value" aria-live="polite">
            {candidateCountValue}
          </output>
          <button
            aria-label={t("increaseCandidateCount")}
            className="app-stepper-button"
            disabled={busy || candidateCountValue >= 5}
            onClick={() => changeCandidateCount(1)}
            type="button"
          >
            <AppIcon name="plus" />
          </button>
        </div>
      </div>
      <Button className="home-paper-button app-paper-button-primary app-generate-button" disabled={busy}>
        {busy ? (
          <AppIcon className="app-button-icon animate-spin" name="loading" />
        ) : (
          <AppIcon className="app-button-icon" name="generate" />
        )}
        <span className="home-paper-button-label">{t("generate")}</span>
      </Button>
      {errorKey ? (
        <p className="auth-modal-error app-request-error" role="alert">
          {tErrors(errorKey)}
        </p>
      ) : null}
    </form>
  );
}

function DishRecommendationCard({
  busy,
  confirmed,
  dish,
  errorKey,
  onAdjustConsumption,
  onConfirm,
  onConsumptionChange,
  onRetryImage,
  retryingImage
}: {
  busy: boolean;
  confirmed: boolean;
  dish: Dish;
  errorKey: string | null;
  onAdjustConsumption: (dishId: string, fridgeItemId: string, delta: number) => void;
  onConfirm: (dish: Dish) => void;
  onConsumptionChange: (dishId: string, fridgeItemId: string, consumedQuantity: number) => void;
  onRetryImage: (dishId: string) => void;
  retryingImage: boolean;
}) {
  const t = useTranslations("recommend");
  const tErrors = useTranslations("errors");

  return (
    <article className="app-recipe-card">
      <DishImageFrame dish={dish} onRetry={onRetryImage} retrying={retryingImage} />
      <div className="app-recipe-card-body">
        <header className="app-recipe-card-header">
          <h2 className="app-card-title">{dish.name}</h2>
          <span className="app-status-sticker app-time-sticker">
            <AppIcon className="app-inline-icon" name="clock" />
            {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
          </span>
        </header>
        <p className="app-muted-text">{dish.summary}</p>
        <details className="app-dish-details">
          <summary>{t("viewSteps")}</summary>
          <ol className="app-instruction-list">
            {dish.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </details>
        <details className="app-consumption-details">
          <summary>{t("consumptionTitle")}</summary>
          <div className="app-consumption-details-body">
            <ConsumptionTable
              confirmed={confirmed}
              dish={dish}
              onAdjustConsumption={onAdjustConsumption}
              onConsumptionChange={onConsumptionChange}
            />
            <Button
              className="home-paper-button app-paper-button-compact app-paper-button-danger app-confirm-consumption-button"
              disabled={busy || confirmed || dish.consumptions.length === 0}
              onClick={() => onConfirm(dish)}
              type="button"
            >
              <AppIcon className="app-button-icon" name="confirm" />
              <span className="home-paper-button-label">
                {confirmed ? t("consumptionConfirmed") : t("confirmConsumption")}
              </span>
            </Button>
            {errorKey ? (
              <p className="auth-modal-error" role="alert">
                {tErrors(errorKey)}
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </article>
  );
}

function DishImageFrame({
  dish,
  onRetry,
  retrying
}: {
  dish: Dish;
  onRetry: (dishId: string) => void;
  retrying: boolean;
}) {
  const t = useTranslations("recommend");

  return (
    <div className="app-image-frame app-dish-image-frame">
      {dish.image.publicUrl ? (
        <Image
          alt={dish.name}
          className="h-full w-full object-cover"
          height={384}
          src={dish.image.publicUrl}
          unoptimized
          width={512}
        />
      ) : (
        <div className="app-image-frame-placeholder">{t(`imageStatus.${dish.image.status}`)}</div>
      )}
      <span className="app-status-sticker app-image-status-sticker">
        {t(`imageStatus.${dish.image.status}`)}
      </span>
      {dish.image.status === "failed" ? (
        <Button
          className="home-paper-button app-paper-button-compact app-paper-button-secondary app-image-retry-button"
          disabled={retrying}
          onClick={() => onRetry(dish.id)}
          type="button"
          variant="secondary"
        >
          <AppIcon className="app-button-icon" name="retry" />
          <span>{retrying ? t("retryingImage") : t("retryImage")}</span>
        </Button>
      ) : null}
    </div>
  );
}

function ConsumptionTable({
  confirmed,
  dish,
  onAdjustConsumption,
  onConsumptionChange
}: {
  confirmed: boolean;
  dish: Dish;
  onAdjustConsumption: (dishId: string, fridgeItemId: string, delta: number) => void;
  onConsumptionChange: (dishId: string, fridgeItemId: string, consumedQuantity: number) => void;
}) {
  const t = useTranslations("recommend");

  return (
    <div className="app-consumption-table">
      {dish.consumptions.length === 0 ? (
        <p className="app-muted-text">{t("noConsumption")}</p>
      ) : (
        dish.consumptions.map((consumption) => (
          <div className="app-consumption-row" key={consumption.fridgeItemId}>
            <span className="app-consumption-name">{consumption.fridgeItemName}</span>
            <input
              aria-label={t("consumptionQuantity", { name: consumption.fridgeItemName })}
              className="app-paper-input app-consumption-input"
              disabled={confirmed}
              min="0.001"
              onChange={(event) =>
                onConsumptionChange(
                  dish.id,
                  consumption.fridgeItemId,
                  Number(event.target.value)
                )
              }
              step="0.001"
              type="number"
              value={consumption.consumedQuantity}
            />
            <span className="app-consumption-unit">{consumption.unit}</span>
            <span className="app-consumption-steppers" aria-hidden={confirmed}>
              <button
                aria-label={t("decreaseConsumption", { name: consumption.fridgeItemName })}
                className="app-stepper-button"
                disabled={confirmed}
                onClick={() => onAdjustConsumption(dish.id, consumption.fridgeItemId, -1)}
                type="button"
              >
                <AppIcon className="app-stepper-icon" name="minus" />
              </button>
              <button
                aria-label={t("increaseConsumption", { name: consumption.fridgeItemName })}
                className="app-stepper-button"
                disabled={confirmed}
                onClick={() => onAdjustConsumption(dish.id, consumption.fridgeItemId, 1)}
                type="button"
              >
                <AppIcon className="app-stepper-icon" name="plus" />
              </button>
            </span>
          </div>
        ))
      )}
    </div>
  );
}
