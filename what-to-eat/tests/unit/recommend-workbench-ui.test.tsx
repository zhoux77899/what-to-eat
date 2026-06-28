import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { RecommendWorkbench } from "@/components/recommend-workbench";

vi.mock("@/lib/api-client", () => ({
  getErrorTranslationKey: () => "configurationError",
  requestJson: vi.fn()
}));

const messages = {
  recommend: {
    formTitle: "Prompt for this recommendation",
    temporaryRequirementPlaceholder: "For example: keep it light",
    candidateCount: "Number of candidates",
    decreaseCandidateCount: "Decrease candidate count",
    increaseCandidateCount: "Increase candidate count",
    generate: "Generate",
    confirmConsumptionCancel: "Cancel",
    confirmConsumptionAction: "Continue",
    confirmConsumptionDescription: "Apply consumption for {name}",
    confirmConsumptionTitle: "Confirm consumption"
  },
  errors: {
    configurationError: "Configuration error"
  }
};

function renderWorkbench() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RecommendWorkbench />
    </NextIntlClientProvider>
  );
}

describe("recommendation request controls", () => {
  it("keeps candidate count between one and five with a bounded stepper", () => {
    renderWorkbench();

    const decrease = screen.getByRole("button", { name: "Decrease candidate count" });
    const increase = screen.getByRole("button", { name: "Increase candidate count" });
    const value = screen.getByText("3");

    fireEvent.click(increase);
    fireEvent.click(increase);
    expect(value).toHaveTextContent("5");
    expect(increase).toBeDisabled();

    fireEvent.click(decrease);
    fireEvent.click(decrease);
    fireEvent.click(decrease);
    fireEvent.click(decrease);
    expect(value).toHaveTextContent("1");
    expect(decrease).toBeDisabled();
  });
});
