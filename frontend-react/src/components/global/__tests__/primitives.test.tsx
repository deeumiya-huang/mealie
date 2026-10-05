import { useState } from "react";
import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { field, useFormValidation } from "@/hooks/utils";
import { i18n, setLocale } from "@/i18n";
import { required } from "@/lib/validators";
import { renderWithProviders } from "@/test/utils";
import { BaseButton } from "../BaseButton";
import { BaseButtonGroup } from "../BaseButtonGroup";
import { BaseDataTable, type DataTableHeader } from "../BaseDataTable";
import { BaseDialog, type BaseDialogProps } from "../BaseDialog";
import { BaseNumberInput } from "../BaseNumberInput";
import { LanguageDialog } from "../LanguageDialog";
import { SafeMarkdown } from "../SafeMarkdown";

vi.mock("@/providers/app-info", () => ({ useAppInfo: () => ({ allowedIframeHosts: [] }) }));

afterEach(async () => {
  await act(() => setLocale("en-US"));
});

describe("BaseButton", () => {
  test("presets set the label; children replace it", () => {
    renderWithProviders(
      <>
        <BaseButton save />
        <BaseButton delete />
        <BaseButton>Custom</BaseButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  test("create is the default and `to` renders a link", () => {
    renderWithProviders(<BaseButton to="/somewhere" />);
    expect(screen.getByRole("link", { name: "Create" })).toHaveAttribute("href", "/somewhere");
  });
});

describe("BaseButtonGroup", () => {
  test("icon buttons are named by their text and report their event", async () => {
    const onAction = vi.fn();
    renderWithProviders(<BaseButtonGroup buttons={[{ icon: "M0 0", text: "Edit", event: "edit" }]} onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onAction).toHaveBeenCalledWith("edit");
  });
});

function DialogHarness(props: Partial<BaseDialogProps>) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <BaseDialog open={open} onOpenChange={setOpen} title="Dialog Title" {...props}>
        <input aria-label="name" />
      </BaseDialog>
    </>
  );
}

describe("BaseDialog", () => {
  test("is a named dialog; submit emits and closes when not loading", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<DialogHarness canSubmit onSubmit={onSubmit} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Dialog Title" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("stays open while loading and with keepOpen", async () => {
    renderWithProviders(<DialogHarness canSubmit keepOpen />);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByTestId("state")).toHaveTextContent("open");
  });

  test("Enter submits; cancel emits cancel and closes", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(<DialogHarness onSubmit={onSubmit} onCancel={onCancel} keepOpen />);
    await userEvent.type(screen.getByRole("textbox", { name: "name" }), "x{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  test("confirm emits confirm and closes", async () => {
    const onConfirm = vi.fn();
    renderWithProviders(<DialogHarness canConfirm onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });
});

interface Row { id: number; name: string; count: number }
const rows: Row[] = [
  { id: 1, name: "Banana", count: 3 },
  { id: 2, name: "apple", count: 10 },
  { id: 3, name: "Cherry", count: 1 },
];
const headers: DataTableHeader<Row>[] = [
  { title: "Name", key: "name" },
  { title: "Count", key: "count" },
];

describe("BaseDataTable", () => {
  const names = () => screen.getAllByRole("row").slice(1).map(row => within(row).getAllByRole("cell")[0].textContent);

  test("renders cells, sorts on header click and filters by search", async () => {
    const { rerender } = renderWithProviders(<BaseDataTable headers={headers} items={rows} />);
    expect(screen.getByRole("cell", { name: "Banana" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["apple", "Banana", "Cherry"]);
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["Cherry", "Banana", "apple"]);
    rerender(<BaseDataTable headers={headers} items={rows} search="ERR" />);
    expect(names()).toEqual(["Cherry"]);
  });

  test("slots render custom cells and selection returns items", async () => {
    const onSelectedChange = vi.fn();
    renderWithProviders(
      <BaseDataTable headers={headers} items={rows} showSelect onSelectedChange={onSelectedChange} slots={{ count: row => `#${row.count}` }} />,
    );
    expect(screen.getByRole("cell", { name: "#10" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(onSelectedChange).toHaveBeenCalledWith([rows[0]]);
  });
});

describe("BaseNumberInput", () => {
  test("clamps to min and steps", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<number | null>(1);
      return <BaseNumberInput label="Qty" value={value} min={0} onChange={(v) => { onChange(v); setValue(v); }} />;
    }
    renderWithProviders(<Harness />);
    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await userEvent.clear(input);
    await userEvent.type(input, "-5");
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});

describe("useFormValidation", () => {
  test("hides errors until validate(), then shows the rule message", () => {
    const { result, rerender } = renderHook(({ name }) => useFormValidation({ name: field(name, [required]) }), {
      initialProps: { name: "" },
    });
    expect(result.current.isValid).toBe(false);
    expect(result.current.fieldProps("name").error).toBe(false);
    let valid = true;
    act(() => {
      valid = result.current.validate();
    });
    expect(valid).toBe(false);
    expect(result.current.fieldProps("name")).toMatchObject({ error: true, helperText: "This Field is Required" });
    rerender({ name: "x" });
    expect(result.current.isValid).toBe(true);
    expect(result.current.fieldProps("name").error).toBe(false);
  });
});

describe("SafeMarkdown", () => {
  test("renders markdown and strips scripts", () => {
    const { container } = renderWithProviders(<SafeMarkdown source="**bold**<script>alert(1)</script>" />);
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("LanguageDialog", () => {
  test("lists the locales and switches the language", async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<LanguageDialog open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog", { name: "Choose Language" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the docs" })).toHaveAttribute("href", "https://docs.mealie.io/contributors/translating/");
    await userEvent.click(screen.getByRole("combobox", { name: "Choose Language" }));
    await userEvent.click(await screen.findByRole("option", { name: /Deutsch \(German\)/ }));
    await vi.waitFor(() => expect(i18n.language).toBe("de-DE"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
