import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FridgeWorkbench } from "@/components/fridge-workbench";

const requestJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  getErrorTranslationKey: () => "configurationError",
  requestJson: requestJsonMock
}));

vi.mock("next/image", () => ({
  default: () => null
}));

const messages = {
  fridge: {
    addTitle: "添加食材",
    editTitle: "编辑食材",
    name: "食材名称",
    quantity: "数量",
    unit: "单位",
    add: "加入冰箱",
    saveChanges: "保存修改",
    cancel: "取消",
    edit: "编辑",
    delete: "删除",
    deleteTitle: "删除食材",
    deleteDescription: "将从冰箱中删除 {name}。此操作无法撤销。",
    deleteConfirm: "删除",
    deleteCancel: "取消",
    retryImage: "重试图片",
    mergeNote: "修改数量或单位不会重新生成图片。",
    empty: "冰箱还是空的。",
    loading: "正在加载冰箱...",
    retryLoad: "重新加载",
    imageStatus: {
      notRequested: "尚未生成图片",
      pending: "图片生成中",
      succeeded: "图片已生成",
      failed: "图片生成失败，可重试"
    }
  },
  errors: {
    configurationError: "服务端配置不完整。"
  }
};

function renderWithIntl() {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <FridgeWorkbench />
    </NextIntlClientProvider>
  );
}

function expectQuantityStepperToUseWholeSteps(input: HTMLElement) {
  expect(input).toHaveAttribute("min", "1");
  expect(input).toHaveAttribute("step", "1");
}

describe("FridgeWorkbench", () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
    requestJsonMock.mockResolvedValue({
      items: [
        {
          id: "fridge-item-1",
          name: "Tomato",
          quantity: 2,
          unit: "kg",
          version: 1,
          imageStatus: null,
          imageUrl: null,
          imageErrorCode: null,
          imageDeadlineAt: null
        }
      ]
    });
  });

  it("keeps fridge quantity steppers at whole-number precision when adding and editing items", async () => {
    renderWithIntl();

    const addQuantityInput = screen.getByRole("spinbutton", { name: "数量" });
    expectQuantityStepperToUseWholeSteps(addQuantityInput);

    fireEvent.click(await screen.findByRole("button", { name: "编辑" }));

    const editQuantityInput = screen.getByRole("spinbutton", { name: "数量" });
    expect(screen.getByRole("textbox", { name: "食材名称" })).toHaveFocus();
    expect(editQuantityInput).toHaveValue(2);
    expectQuantityStepperToUseWholeSteps(editQuantityInput);
  });

  it("restores focus to the edited inventory row after saving", async () => {
    renderWithIntl();

    fireEvent.click(await screen.findByRole("button", { name: "编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => expect(screen.getByRole("article")).toHaveFocus());
  });

  it("prevents deletion while editing and restores row focus after cancel", async () => {
    renderWithIntl();

    fireEvent.click(await screen.findByRole("button", { name: "编辑" }));

    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.getByRole("article")).toHaveFocus());
    expect(screen.getByRole("button", { name: "删除" })).toBeEnabled();
  });

  it("locks the edited item while its PATCH request is pending", async () => {
    let resolveSave!: (value: unknown) => void;
    const saveRequest = new Promise((resolve) => {
      resolveSave = resolve;
    });
    requestJsonMock.mockImplementation((_url, options) =>
      options?.method === "PATCH"
        ? saveRequest
        : Promise.resolve({
            items: [
              {
                id: "fridge-item-1",
                name: "Tomato",
                quantity: 2,
                unit: "kg",
                version: 1,
                imageStatus: null,
                imageUrl: null,
                imageErrorCode: null,
                imageDeadlineAt: null
              }
            ]
          })
    );

    renderWithIntl();
    fireEvent.click(await screen.findByRole("button", { name: "编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "编辑" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();

    await act(async () => resolveSave({ item: null }));
    await waitFor(() => expect(screen.getByRole("article")).toHaveFocus());
  });

  it("shows a recoverable error instead of an empty inventory when loading fails", async () => {
    requestJsonMock.mockReset();
    requestJsonMock.mockRejectedValueOnce(new Error("Load failed"));

    renderWithIntl();

    expect(await screen.findByRole("alert")).toHaveTextContent("服务端配置不完整。");
    expect(screen.queryByText("冰箱还是空的。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeVisible();
  });
});
