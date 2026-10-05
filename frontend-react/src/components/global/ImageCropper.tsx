// Usage: <ImageCropper img={url} cropperWidth="100%" submitted={saving} onSave={blob => …} onDelete={() => …} />
// Image cropper (react-advanced-cropper) with delete / save buttons and an edit menu to flip and rotate.
// The save button shows once the image was changed; `changed` counts cropper changes (−1 right after loading).
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Cropper, type CropperRef, type CropperState } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Popover from "@mui/material/Popover";
import type { Theme } from "@mui/material/styles";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface ImageCropperProps {
  img: string;
  cropperWidth?: string;
  submitted?: boolean;
  className?: string;
  onSave?: (item: Blob) => void;
  onDelete?: () => void;
}

interface Control {
  color: "info";
  icon: string;
  action: "flip-horizontal" | "flip-vertical" | "rotate-left" | "rotate-right";
}

function FilledIconButton({ color, ...props }: { color: "error" | "success" | "info"; disabled?: boolean; onClick?: (event: React.MouseEvent<HTMLElement>) => void; children: React.ReactNode }) {
  return (
    <IconButton
      {...props}
      sx={(theme: Theme) => ({
        "bgcolor": theme.palette[color].main,
        "color": theme.palette[color].contrastText,
        "&:hover": { bgcolor: theme.palette[color].dark },
        "&.Mui-disabled": { opacity: 0.5, bgcolor: theme.palette[color].main, color: theme.palette[color].contrastText },
      })}
    />
  );
}

export function ImageCropper({ img, cropperWidth, submitted = false, className, onSave, onDelete }: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [changed, setChanged] = useState(0);
  // Left to the cropper's own sizing until the image is rotated; see rotate().
  const [aspectRatio, setAspectRatio] = useState<string | number>("auto");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  function onReady() {
    setAspectRatio("auto");
    setChanged(-1);
  }

  function flip(horizontal: boolean, vertical?: boolean) {
    const cropper = cropperRef.current;
    if (!cropper) return;
    cropper.flipImage(horizontal, vertical);
    setChanged(current => current + 1);
  }

  function rotate(angle: number) {
    const cropper = cropperRef.current;
    if (!cropper) return;
    cropper.rotateImage(angle);
    setChanged(current => current + 1);

    // A quarter turn swaps the image's width and height. Pin the box to the new
    // orientation, otherwise the cropper keeps the visible area it computed for
    // the old one and part of the rotated image ends up outside of it.
    const image = cropper.getImage();
    if (!image) return;
    const quarterTurned = Math.abs(image.transforms.rotate % 180) === 90;

    // the cropper measures its own box, so let the new size land first
    flushSync(() => setAspectRatio(quarterTurned ? image.height / image.width : image.width / image.height));
    cropper.refresh();
  }

  const controls: Control[][] = [
    [
      { color: "info", icon: icons.flipHorizontal, action: "flip-horizontal" },
      { color: "info", icon: icons.flipVertical, action: "flip-vertical" },
    ],
    [
      { color: "info", icon: icons.rotateLeft, action: "rotate-left" },
      { color: "info", icon: icons.rotateRight, action: "rotate-right" },
    ],
  ];

  function runControl(action: Control["action"]) {
    switch (action) {
      case "flip-horizontal":
        return flip(true, false);
      case "flip-vertical":
        return flip(false, true);
      case "rotate-left":
        return rotate(-90);
      case "rotate-right":
        return rotate(90);
    }
  }

  function save() {
    const cropper = cropperRef.current;
    if (!cropper) return;
    const canvas = cropper.getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        onSave?.(blob);
      }
    });
  }

  function defaultSize({ imageSize, visibleArea }: CropperState) {
    return {
      width: (visibleArea || imageSize).width,
      height: (visibleArea || imageSize).height,
    };
  }

  return (
    <Card className={className} elevation={4} sx={{ m: 0, pt: 1 }}>
      <CardContent>
        {/* Controls Row (Menu) */}
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", mb: 1, mx: 0.5 }}>
          <FilledIconButton color="error" disabled={submitted} onClick={() => onDelete?.()}>
            <MdiIcon path={icons.delete} />
          </FilledIconButton>
          <Box sx={{ flexGrow: 1 }} />
          {changed !== 0 && (
            <Box sx={{ mr: 1 }}>
              <FilledIconButton color="success" disabled={submitted} onClick={save}>
                <MdiIcon path={icons.save} />
              </FilledIconButton>
            </Box>
          )}
          <FilledIconButton color="info" disabled={submitted} onClick={event => setMenuAnchor(event.currentTarget)}>
            <MdiIcon path={icons.edit} />
          </FilledIconButton>
          <Popover
            open={menuAnchor !== null}
            anchorEl={menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            slotProps={{ paper: { sx: { mt: 0.5 } } }}
          >
            {controls.map((row, keyRow) => (
              <List key={keyRow}>
                {row.map((control, keyControl) => (
                  <ListItemButton key={keyControl} disabled={submitted} onClick={() => runControl(control.action)}>
                    <ListItemIcon sx={{ minWidth: 0 }}>
                      <MdiIcon path={control.icon} color={control.color} />
                    </ListItemIcon>
                  </ListItemButton>
                ))}
              </List>
            ))}
          </Popover>
        </Box>

        {/* Image Row */}
        <Cropper
          ref={cropperRef}
          className="cropper"
          src={img}
          defaultSize={defaultSize}
          style={{ width: cropperWidth, aspectRatio }}
          onChange={() => setChanged(current => current + 1)}
          onReady={onReady}
        />
      </CardContent>
    </Card>
  );
}
