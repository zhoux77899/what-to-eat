import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";

export type FoodPreferences = {
  locale: Locale;
  preferenceText: string;
};

export type RecommendationPreferenceContext = {
  locale: Locale;
  preferenceText: string;
  temporaryRequirement: string | null;
};

export const DEFAULT_PREFERENCES: FoodPreferences = {
  locale: DEFAULT_LOCALE,
  preferenceText: ""
};

export function resolveRecommendationContext(
  longTerm: FoodPreferences,
  request: {
    locale?: Locale;
    temporaryRequirement?: string | null;
  }
): RecommendationPreferenceContext {
  return {
    locale: request.locale ?? longTerm.locale,
    preferenceText: longTerm.preferenceText,
    temporaryRequirement: request.temporaryRequirement ?? null
  };
}
