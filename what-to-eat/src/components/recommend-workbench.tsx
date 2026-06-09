"use client";

import { Check, LoaderCircle, Sparkles } from "lucide-react";
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
  const tErrors = useTranslations("errors");
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
          temporaryRequirement: temporaryRequirement || null
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
    <div className="grid gap-6">
      <form className="app-paper-card app-form-card" onSubmit={submit}>
        <span className="app-paper-card-pin" aria-hidden="true" />
        <h2 className="app-card-title">{t("formTitle")}</h2>
        <label className="app-form-field">
          {t("candidateCount")}
          <select
            className="app-paper-input px-3"
            onChange={(event) => setCandidateCount(event.target.value)}
            value={candidateCount}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="app-form-field">
          {t("temporaryRequirement")}
          <textarea
            className="app-paper-input min-h-24 px-3 py-3"
            maxLength={500}
            onChange={(event) => setTemporaryRequirement(event.target.value)}
            placeholder={t("temporaryRequirementPlaceholder")}
            value={temporaryRequirement}
          />
        </label>
        <div className="app-action-row">
          <Button
            className="home-paper-button app-paper-button-primary app-table-button"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="app-button-icon animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="app-button-icon" aria-hidden="true" />
            )}
            <span className="home-paper-button-label">{t("generate")}</span>
          </Button>
        </div>
        <p className="app-muted-text">{t("temporaryNote")}</p>
        {errorKey ? <p className="auth-modal-error">{tErrors(errorKey)}</p> : null}
      </form>

      {dishes.map((dish) => {
        const confirmed = confirmedDishIds.includes(dish.id);

        return (
          <article className="app-paper-card grid gap-4 md:grid-cols-[12rem_1fr]" key={dish.id}>
            <div className="relative aspect-square overflow-hidden rounded-xl border border-current/20 bg-white/50">
              {dish.image.publicUrl ? (
                <Image
                  alt={dish.name}
                  className="h-full w-full object-cover"
                  height={384}
                  src={dish.image.publicUrl}
                  unoptimized
                  width={384}
                />
              ) : (
                <div className="grid h-full place-items-center px-3 text-center text-sm opacity-70">
                  {t(`imageStatus.${dish.image.status}`)}
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <div>
                <h2 className="app-card-title">{dish.name}</h2>
                <p className="app-muted-text">{dish.summary}</p>
                <p className="app-muted-text">
                  {t("estimatedMinutes", { minutes: dish.estimatedMinutes })}
                </p>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {dish.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
              <div className="grid gap-2">
                <h3 className="font-black">{t("consumptionTitle")}</h3>
                {dish.consumptions.length === 0 ? (
                  <p className="app-muted-text">{t("noConsumption")}</p>
                ) : (
                  dish.consumptions.map((consumption) => (
                    <label className="grid grid-cols-[1fr_7rem_auto] items-center gap-2 text-sm" key={consumption.fridgeItemId}>
                      <span>{consumption.fridgeItemName}</span>
                      <input
                        className="app-paper-input min-h-0 px-2 py-1"
                        disabled={confirmed}
                        min="0.001"
                        onChange={(event) =>
                          updateConsumption(
                            dish.id,
                            consumption.fridgeItemId,
                            Number(event.target.value)
                          )
                        }
                        step="0.001"
                        type="number"
                        value={consumption.consumedQuantity}
                      />
                      <span>{consumption.unit}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="app-action-row">
                <Button
                  className="home-paper-button app-paper-button-compact app-paper-button-primary"
                  disabled={busy || confirmed || dish.consumptions.length === 0}
                  onClick={() => confirm(dish)}
                  type="button"
                >
                  <Check className="app-button-icon" aria-hidden="true" />
                  <span className="home-paper-button-label">
                    {confirmed ? t("consumptionConfirmed") : t("confirmConsumption")}
                  </span>
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
