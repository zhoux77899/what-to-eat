import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAiKeyWorkbench } from "@/components/openai-key-workbench";
import { PreferencesWorkbench } from "@/components/preferences-workbench";

const requestJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  getErrorTranslationKey: () => "configurationError",
  requestJson: requestJsonMock
}));

const messages = {
  preferences: {
    description: "Long-term preference description",
    fieldLabel: "Long-term preference",
    placeholder: "Preference placeholder",
    save: "Save preferences",
    saving: "Saving preferences",
    saved: "Preferences saved.",
    loading: "Loading preferences",
    retry: "Retry loading"
  },
  openAiKey: {
    description: "API key description",
    statusLabel: "Key status",
    keyHintLabel: "Key hint",
    fieldLabel: "API key",
    placeholder: "sk-...",
    save: "Save key",
    saving: "Saving key",
    validate: "Re-validate",
    validating: "Validating",
    delete: "Delete key",
    deleting: "Deleting key",
    deleteTitle: "Delete API key",
    deleteDescription: "Delete this API key?",
    deleteConfirm: "Delete",
    deleteCancel: "Cancel",
    loading: "Loading key status",
    noHint: "not configured",
    status: {
      not_configured: "not configured",
      validation_required: "validation required",
      valid: "valid",
      invalid: "invalid",
      unknown: "unknown"
    },
    imageVerificationNote: "Image verification note"
  },
  errors: {
    configurationError: "Configuration error"
  }
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("workbench state feedback", () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
  });

  it("shows final preference form geometry without a loading skeleton", () => {
    requestJsonMock.mockReturnValue(new Promise<never>(() => undefined));

    renderWithIntl(<PreferencesWorkbench locale="en" />);

    expect(screen.getByRole("textbox", { name: "Long-term preference" })).toBeDisabled();
    expect(document.querySelector(".app-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Long-term preference" })).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("clears saved preference feedback as soon as the saved value changes", async () => {
    requestJsonMock
      .mockResolvedValueOnce({ preferences: { preferenceText: "No cilantro" } })
      .mockResolvedValueOnce({ preferences: { preferenceText: "No cilantro" } });

    renderWithIntl(<PreferencesWorkbench locale="en" />);

    const field = await screen.findByRole("textbox", { name: "Long-term preference" });
    const saveButton = screen.getByRole("button", { name: "Save preferences" });
    expect(saveButton).toBeDisabled();
    fireEvent.change(field, { target: { value: "No cilantro or peanuts" } });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    expect(await screen.findByText("Preferences saved.")).toBeVisible();
    expect(saveButton).toBeDisabled();
    fireEvent.change(field, { target: { value: "No peanuts" } });
    expect(screen.queryByText("Preferences saved.")).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting an OpenAI key", async () => {
    requestJsonMock.mockResolvedValueOnce({
      key: { hint: "sk-...1234", status: "valid" },
      status: "valid"
    });

    renderWithIntl(<OpenAiKeyWorkbench />);

    const deleteButton = await screen.findByRole("button", { name: "Delete key" });
    fireEvent.click(deleteButton);

    expect(screen.getByRole("dialog", { name: "Delete API key" })).toBeVisible();
    expect(requestJsonMock).toHaveBeenCalledTimes(1);
  });

  it("keeps OpenAI key state internal", async () => {
    requestJsonMock.mockResolvedValueOnce({
      key: { hint: "sk-...1234", status: "valid" },
      status: "valid"
    });

    renderWithIntl(<OpenAiKeyWorkbench />);

    expect(await screen.findByRole("button", { name: "Delete key" })).toBeEnabled();
    expect(screen.queryByText("Key status")).not.toBeInTheDocument();
    expect(screen.queryByText("Key hint")).not.toBeInTheDocument();
  });

  it("focuses preference feedback after a keyboard-triggered save failure", async () => {
    requestJsonMock
      .mockResolvedValueOnce({ preferences: { preferenceText: "No cilantro" } })
      .mockRejectedValueOnce(new Error("Save failed"));

    renderWithIntl(<PreferencesWorkbench locale="en" />);

    const field = await screen.findByRole("textbox", { name: "Long-term preference" });
    fireEvent.change(field, { target: { value: "No cilantro or peanuts" } });
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }), { detail: 0 });

    const feedback = await screen.findByRole("alert");
    expect(feedback).toHaveFocus();
  });

  it("keeps preferences read-only after load failure until retry succeeds", async () => {
    requestJsonMock
      .mockRejectedValueOnce(new Error("Load failed"))
      .mockResolvedValueOnce({ preferences: { preferenceText: "No shellfish" } });

    renderWithIntl(<PreferencesWorkbench locale="en" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Configuration error");
    expect(screen.getByRole("textbox", { name: "Long-term preference" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save preferences" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));

    const field = await screen.findByDisplayValue("No shellfish");
    expect(field).toBeEnabled();
  });
});
