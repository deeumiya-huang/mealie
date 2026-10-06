import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useClipboard } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import { useShoppingListCopy } from "../use-shopping-list-copy";
import { MOCK_ITEM } from "./mocks";

vi.mock("@/hooks/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/utils")>();
  return { ...actual, useClipboard: vi.fn() };
});

const mockCopy = vi.fn().mockImplementation(args => new Promise(resolve => resolve(args)));

vi.mocked(useClipboard).mockImplementation(() => {
  return {
    isSupported: true,
    copied: true,
    copy: mockCopy,
  };
});
const wrapper = () => {
  const { result } = renderHook(() => {
    const { t } = useI18n();
    return {
      t,
      ...useShoppingListCopy(),
    };
  });
  return result.current;
};

const TEST_HEADER = "SPECIAL HEADER!";

const MOCK_LIST: { [key: string]: ShoppingListItemOut[] } = {
  [TEST_HEADER]: [MOCK_ITEM],
  [TEST_HEADER + "2"]: [MOCK_ITEM],
};

describe("Shopping list copy composable", () => {
  describe("copyListItems", () => {
    test("copies markdown lists correctly", () => {
      const { copyListItems } = wrapper();
      copyListItems(MOCK_LIST, "markdown");
      const expected = [
        "# SPECIAL HEADER!",
        "- [ ] MOCK_ITEM",
        "",
        "# SPECIAL HEADER!2",
        "- [ ] MOCK_ITEM",
      ].join("\n");

      expect(mockCopy).toBeCalledWith(expected);
    });
    test("copies plain text lists correctly", () => {
      const { copyListItems } = wrapper();
      copyListItems(MOCK_LIST, "plain");
      const expected = [
        "[SPECIAL HEADER!]",
        "MOCK_ITEM",
        "",
        "[SPECIAL HEADER!2]",
        "MOCK_ITEM",
      ].join("\n");

      expect(mockCopy).toBeCalledWith(expected);
    });
    test("omits the heading when every item is unlabeled", () => {
      const { copyListItems, t } = wrapper();
      const noLabelList = { [t("shopping-list.no-label")]: [MOCK_ITEM, MOCK_ITEM] };

      copyListItems(noLabelList, "plain");
      expect(mockCopy).toBeCalledWith(["MOCK_ITEM", "MOCK_ITEM"].join("\n"));

      copyListItems(noLabelList, "markdown");
      expect(mockCopy).toBeCalledWith(["- [ ] MOCK_ITEM", "- [ ] MOCK_ITEM"].join("\n"));
    });

    test("keeps the no-label heading when other labels are also present", () => {
      const { copyListItems, t } = wrapper();
      const mixedList = {
        [t("shopping-list.no-label")]: [MOCK_ITEM],
        [TEST_HEADER]: [MOCK_ITEM],
      };

      copyListItems(mixedList, "plain");
      const expected = [
        `[${t("shopping-list.no-label")}]`,
        "MOCK_ITEM",
        "",
        `[${TEST_HEADER}]`,
        "MOCK_ITEM",
      ].join("\n");

      expect(mockCopy).toBeCalledWith(expected);
    });
  });

  describe("formatCopiedLabelHeading", () => {
    test("copies markdown headers correctly", () => {
      const { formatCopiedLabelHeading } = wrapper();
      const header = formatCopiedLabelHeading("markdown", TEST_HEADER);
      expect(header).toEqual(`# ${TEST_HEADER}`);
    });
    test("copies plain text headers correctly", () => {
      const { formatCopiedLabelHeading } = wrapper();
      const header = formatCopiedLabelHeading("plain", TEST_HEADER);
      expect(header).toEqual(`[${TEST_HEADER}]`);
    });
  });

  describe("formatCopiedListItem", () => {
    test("copies markdown items correctly", () => {
      const { formatCopiedListItem } = wrapper();
      const header = formatCopiedListItem("markdown", MOCK_ITEM);
      expect(header).toEqual(`- [ ] ${MOCK_ITEM.display}`);
    });
    test("copies plain text items correctly", () => {
      const { formatCopiedListItem } = wrapper();
      const header = formatCopiedListItem("plain", MOCK_ITEM);
      expect(header).toEqual(MOCK_ITEM.display);
    });
    test("copies items without a display as empty", () => {
      const { formatCopiedListItem } = wrapper();
      const header = formatCopiedListItem("plain", { ...MOCK_ITEM, display: undefined });
      expect(header).toEqual("");
    });
  });
});
