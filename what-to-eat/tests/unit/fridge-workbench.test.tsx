import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(editQuantityInput).toHaveValue(2);
    expectQuantityStepperToUseWholeSteps(editQuantityInput);
  });
});
