"use client";

import { Check, Clock3, Lightbulb, LoaderCircle, Minus, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";

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
  const [candidateCount, setCandidateCount] = useState("3");
  const [temporaryRequirement, setTemporaryRequirement] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [confirmedDishIds, setConfirmedDishIds] = useState<string[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);

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
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
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
    setBusy(true);

    try {
      await requestJson("/api/fridge-items/apply-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumptions: dish.consumptions })
      });
      setConfirmedDishIds((current) => [...current, dish.id]);
      setErrorKey(null);
    } catch (error) {
      setErrorKey(getErrorTranslationKey(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-workspace-grid app-recommend-workspace app-recommend-workbench">
      <RecommendationRequestStrip
        busy={busy}
        candidateCount={candidateCount}
        errorKey={errorKey}
        onCandidateCountChange={setCandidateCount}
        onSubmit={submit}
        onTemporaryRequirementChange={setTemporaryRequirement}
        temporaryRequirement={temporaryRequirement}
      />

      {dishes.length > 0 ? (
        <section className="app-recommend-results" aria-live="polite">
          <div className="app-recommend-results-ribbon">
            <span>{t("resultsTitle")}</span>
          </div>
          <div className="app-recommend-dish-grid">
            {dishes.map((dish) => (
              <DishRecommendationCard
                busy={busy}
                confirmed={confirmedDishIds.includes(dish.id)}
                dish={dish}
                key={dish.id}
                onAdjustConsumption={adjustConsumption}
                onConfirm={confirm}
                onConsumptionChange={updateConsumption}
              />
            ))}
          </div>
          <p className="app-recommend-tip">
            <Lightbulb className="app-inline-icon" aria-hidden="true" />
            <span>{t("confirmationTip")}</span>
          </p>
        </section>
      ) : null}
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
      <label className="app-form-field app-candidate-count-field">
        <span className="app-request-label">{t("candidateCount")}</span>
        <select
          className="app-paper-input app-request-select"
          onChange={(event) => onCandidateCountChange(event.target.value)}
          value={candidateCount}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <Button className="home-paper-button app-paper-button-primary app-generate-button" disabled={busy}>
        {busy ? (
          <LoaderCircle className="app-button-icon animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="app-button-icon" aria-hidden="true" />
        )}
        <span className="home-paper-button-label">{t("generate")}</span>
      </Button>
      {errorKey ? <p className="auth-modal-error app-request-error">{tErrors(errorKey)}</p> : null}
    </form>
  );
}

function DishRecommendationCard({
  busy,
  confirmed,
  dish,
  onAdjustConsumption,
  onConfirm,
  onConsumptionChange
}: {
  busy: boolean;
  confirmed: boolean;
  dish: Dish;
  onAdjustConsumption: (dishId: string, fridgeItemId: string, delta: number) => void;
  onConfirm: (dish: Dish) => void;
  onConsumptionChange: (dishId: string, fridgeItemId: string, consumedQuantity: number) => void;
}) {
  const t = useTranslations("recommend");

  return (
    <article className="app-recipe-card">
      <DishImageFrame dish={dish} />
      <div className="app-recipe-card-body">
        <header className="app-recipe-card-header">
          <h2 className="app-card-title">{dish.name}</h2>
          <span className="app-status-sticker app-time-sticker">
            <Clock3 className="app-inline-icon" aria-hidden="true" />
            {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
          </span>
        </header>
        <p className="app-muted-text">{dish.summary}</p>
        <ol className="app-instruction-list">
          {dish.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
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
          <Check className="app-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label">
            {confirmed ? t("consumptionConfirmed") : t("confirmConsumption")}
          </span>
        </Button>
      </div>
    </article>
  );
}

function DishImageFrame({ dish }: { dish: Dish }) {
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
      <h3 className="app-consumption-title">{t("consumptionTitle")}</h3>
      {dish.consumptions.length === 0 ? (
        <p className="app-muted-text">{t("noConsumption")}</p>
      ) : (
        dish.consumptions.map((consumption) => (
          <label className="app-consumption-row" key={consumption.fridgeItemId}>
            <span className="app-consumption-name">{consumption.fridgeItemName}</span>
            <input
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
                className="app-stepper-button"
                disabled={confirmed}
                onClick={() => onAdjustConsumption(dish.id, consumption.fridgeItemId, -1)}
                type="button"
              >
                <Minus className="app-stepper-icon" aria-hidden="true" />
              </button>
              <button
                className="app-stepper-button"
                disabled={confirmed}
                onClick={() => onAdjustConsumption(dish.id, consumption.fridgeItemId, 1)}
                type="button"
              >
                <Plus className="app-stepper-icon" aria-hidden="true" />
              </button>
            </span>
          </label>
        ))
      )}
    </div>
  );
}
