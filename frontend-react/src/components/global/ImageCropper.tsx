import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Cropper } from "react-advanced-cropper";
import type { CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import { icons } from "~/lib/icons";
import { Icon } from "./Icon";

export interface ImageCropperProps {
  img: string;
  cropperWidth?: string;
  submitted?: boolean;
  onSave?: (blob: Blob) => void;
  onDelete?: () => void;
}

export function ImageCropper({ img, cropperWidth, submitted = false, onSave, onDelete }: ImageCropperProps) {
  const cropper = useRef<CropperRef>(null);
  const [changed, setChanged] = useState(0);
  // Left to the cropper's own sizing until the image is rotated; see rotate().
  const [aspectRatio, setAspectRatio] = useState<string | number>("auto");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  function flip(horizontal: boolean, vertical?: boolean) {
    if (!cropper.current) return;
    cropper.current.flipImage(horizontal, vertical);
    setChanged(c => c + 1);
  }

  function rotate(angle: number) {
    const instance = cropper.current;
    if (!instance) return;
    instance.rotateImage(angle);
    setChanged(c => c + 1);

    // A quarter turn swaps the image's width and height. Pin the box to the new orientation,
    // otherwise the cropper keeps the visible area it computed for the old one.
    const image = instance.getImage();
    if (image) {
      const quarterTurned = Math.abs(image.transforms.rotate % 180) === 90;
      setAspectRatio(quarterTurned ? image.height / image.width : image.width / image.height);
    }
    // the cropper measures its own box, so let the new size land first
    requestAnimationFrame(() => void instance.refresh());
  }

  const controls = [
    [
      { color: "info", icon: icons.flipHorizontal, callback: () => flip(true, false) },
      { color: "info", icon: icons.flipVertical, callback: () => flip(false, true) },
    ],
    [
      { color: "info", icon: icons.rotateLeft, callback: () => rotate(-90) },
      { color: "info", icon: icons.rotateRight, callback: () => rotate(90) },
    ],
  ];

  function save() {
    const canvas = cropper.current?.getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave?.(blob);
    });
  }

  return (
    <Card elevation={4} sx={{ m: 0, pt: 1 }}>
      <CardContent>
        <Box sx={{ display: "flex", mb: 1, mx: 0.5, alignItems: "center" }}>
          <IconButton color="error" disabled={submitted} onClick={() => onDelete?.()}>
            <Icon path={icons.delete} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          {changed > 0 && (
            <IconButton color="success" sx={{ mr: 1 }} disabled={submitted} onClick={save}>
              <Icon path={icons.save} />
            </IconButton>
          )}
          <IconButton color="info" disabled={submitted} onClick={e => setAnchor(e.currentTarget)}>
            <Icon path={icons.edit} />
          </IconButton>
          <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}>
            {controls.map((row, keyRow) => (
              <Box key={keyRow} sx={{ display: "flex" }}>
                {row.map((control, keyControl) => (
                  <MenuItem key={keyControl} disabled={submitted} onClick={() => control.callback()}>
                    <Icon path={control.icon} color={control.color} />
                  </MenuItem>
                ))}
              </Box>
            ))}
          </Menu>
        </Box>
        <Cropper
          ref={cropper}
          src={img}
          className="cropper"
          style={{ width: cropperWidth, aspectRatio: String(aspectRatio) }}
          defaultSize={({ imageSize, visibleArea }) => ({
            width: (visibleArea || imageSize).width,
            height: (visibleArea || imageSize).height,
          })}
          onChange={() => setChanged(c => c + 1)}
          onReady={() => {
            setAspectRatio("auto");
            setChanged(-1);
          }}
        />
      </CardContent>
    </Card>
  );
}

export default ImageCropper;
