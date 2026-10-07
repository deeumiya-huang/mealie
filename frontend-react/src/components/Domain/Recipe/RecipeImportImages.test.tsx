import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { stubI18n } from "@/test/utils";
import { RecipeImportImages } from "./RecipeImportImages";

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({}),
}));

// The cropper (react-advanced-cropper) needs a real browser; the stand-in exposes its three outputs.
vi.mock("@/components/global/ImageCropper", () => ({
  ImageCropper: ({ img, submitted, onSave, onDelete }: {
    img: string;
    submitted?: boolean;
    onSave?: (blob: Blob) => void;
    onDelete?: () => void;
  }) => (
    <div data-testid="cropper" data-img={img} data-submitted={String(!!submitted)}>
      <button onClick={() => onSave?.(new Blob(["cropped"], { type: "image/png" }))}>{`save ${img}`}</button>
      <button onClick={onDelete}>{`delete ${img}`}</button>
    </div>
  ),
}));

const { t } = stubI18n();

let urlCounter = 0;
const created: string[] = [];
const revoked: string[] = [];

function Harness({ disabled = false, onImages }: { disabled?: boolean; onImages: (images: (Blob | File)[]) => void }) {
  const [images, setImages] = useState<(Blob | File)[]>([]);
  return (
    <RecipeImportImages
      value={images}
      disabled={disabled}
      onChange={(next) => {
        setImages(next);
        onImages(next);
      }}
    />
  );
}

function fileInput(container: HTMLElement) {
  return container.querySelector("input[type=file]") as HTMLInputElement;
}

function image(name: string) {
  return new File([name], name, { type: "image/png" });
}

describe("RecipeImportImages", () => {
  beforeEach(() => {
    urlCounter = 0;
    created.length = 0;
    revoked.length = 0;
    URL.createObjectURL = () => {
      const url = `blob:image-${++urlCounter}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
    };
  });

  afterEach(() => {
    cleanup();
  });

  test("offers to upload images and shows a cropper per chosen image", async () => {
    const user = userEvent.setup();
    const onImages = vi.fn();
    const { container } = render(<Harness onImages={onImages} />);

    expect(screen.getByRole("button", { name: t("recipe.upload-images") })).toBeInTheDocument();
    expect(screen.queryByTestId("cropper")).not.toBeInTheDocument();

    await user.upload(fileInput(container), [image("a.png"), image("b.png")]);

    expect(screen.getByText(t("recipe.crop-and-rotate-the-image"))).toBeInTheDocument();
    expect(screen.getAllByTestId("cropper").map(cropper => cropper.getAttribute("data-img"))).toEqual(["blob:image-1", "blob:image-2"]);
    expect(screen.getByRole("button", { name: t("recipe.upload-more-images") })).toBeInTheDocument();
    expect(onImages).toHaveBeenLastCalledWith([expect.objectContaining({ name: "a.png" }), expect.objectContaining({ name: "b.png" })]);
  });

  test("a single image has no cover button; with several the first one is the cover", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness onImages={vi.fn()} />);

    await user.upload(fileInput(container), [image("a.png")]);
    expect(screen.queryByRole("button", { name: t("recipe.cover-image") })).not.toBeInTheDocument();

    await user.upload(fileInput(container), [image("b.png")]);
    expect(screen.getByRole("button", { name: t("recipe.cover-image") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("recipe.set-as-cover-image") })).toBeEnabled();
  });

  test("moving an image to the cover position swaps the images and their previews", async () => {
    const user = userEvent.setup();
    const onImages = vi.fn();
    const { container } = render(<Harness onImages={onImages} />);

    await user.upload(fileInput(container), [image("a.png"), image("b.png")]);
    await user.click(screen.getByRole("button", { name: t("recipe.set-as-cover-image") }));

    expect(onImages).toHaveBeenLastCalledWith([expect.objectContaining({ name: "b.png" }), expect.objectContaining({ name: "a.png" })]);
    expect(screen.getAllByTestId("cropper").map(cropper => cropper.getAttribute("data-img"))).toEqual(["blob:image-2", "blob:image-1"]);
  });

  test("deleting an image revokes its preview and removes it", async () => {
    const user = userEvent.setup();
    const onImages = vi.fn();
    const { container } = render(<Harness onImages={onImages} />);

    await user.upload(fileInput(container), [image("a.png"), image("b.png")]);
    await user.click(screen.getByRole("button", { name: "delete blob:image-1" }));

    expect(revoked).toEqual(["blob:image-1"]);
    expect(onImages).toHaveBeenLastCalledWith([expect.objectContaining({ name: "b.png" })]);
    expect(screen.getAllByTestId("cropper").map(cropper => cropper.getAttribute("data-img"))).toEqual(["blob:image-2"]);
  });

  test("a saved crop replaces the image and its preview", async () => {
    const user = userEvent.setup();
    const onImages = vi.fn();
    const { container } = render(<Harness onImages={onImages} />);

    await user.upload(fileInput(container), [image("a.png")]);
    await user.click(screen.getByRole("button", { name: "save blob:image-1" }));

    const [images] = onImages.mock.calls.at(-1) as [(Blob | File)[]];
    expect(images).toHaveLength(1);
    expect(images[0]).not.toBeInstanceOf(File);
    expect(screen.getByTestId("cropper")).toHaveAttribute("data-img", "blob:image-2");
  });

  test("revokes the previews when it goes away, and disables everything while submitting", async () => {
    const user = userEvent.setup();
    const { container, unmount, rerender } = render(<Harness onImages={vi.fn()} />);

    await user.upload(fileInput(container), [image("a.png"), image("b.png")]);
    rerender(<Harness disabled onImages={vi.fn()} />);

    expect(screen.getByRole("button", { name: t("recipe.upload-more-images") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("recipe.set-as-cover-image") })).toBeDisabled();
    expect(screen.getAllByTestId("cropper").every(cropper => cropper.getAttribute("data-submitted") === "true")).toBe(true);

    unmount();
    expect([...revoked].sort()).toEqual(["blob:image-1", "blob:image-2"]);
  });
});
