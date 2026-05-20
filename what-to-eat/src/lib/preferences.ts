import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";

export type BudgetLevel = "low" | "medium" | "high";

export type FoodPreferences = {
  locale: Locale;
  dietaryRestrictions: string[];
  dislikedFoods: string[];
  budgetLevel: BudgetLevel;
  locationHint: string | null;
};

export type PreferenceOverrides = Partial<FoodPreferences>;

export const DEFAULT_PREFERENCES: FoodPreferences = {
  locale: DEFAULT_LOCALE,
  dietaryRestrictions: [],
  dislikedFoods: [],
  budgetLevel: "medium",
  locationHint: null
};

export function mergePreferences(
  longTerm: FoodPreferences,
  temporaryOverrides: PreferenceOverrides
) {
  return {
    longTerm,
    effective: {
      locale: temporaryOverrides.locale ?? longTerm.locale,
      dietaryRestrictions:
        temporaryOverrides.dietaryRestrictions ?? longTerm.dietaryRestrictions,
      dislikedFoods: temporaryOverrides.dislikedFoods ?? longTerm.dislikedFoods,
      budgetLevel: temporaryOverrides.budgetLevel ?? longTerm.budgetLevel,
      locationHint: temporaryOverrides.locationHint ?? longTerm.locationHint
    } satisfies FoodPreferences
  };
}
