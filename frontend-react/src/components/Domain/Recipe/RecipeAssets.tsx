// Usage: <RecipeAssets value={recipe.assets} onChange={assets => …} edit={isEditForm} slug={recipe.slug} recipeId={recipe.id} />
// The recipe's assets card: image assets open in a lightbox, other files open in a new tab, each can be downloaded;
// while editing there is a menu per asset (view, download, copy embed code, delete) and a "+" button to upload a new
// one. (Vue `v-model` → `value` + `onChange`.)
import { useState, type MouseEvent, type SyntheticEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useStaticRoutes, useUserApi } from "@/hooks/api";
import { useCopy } from "@/hooks/use-copy";
import { alert } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { RecipeAsset } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeImageLightbox } from "./RecipeImageLightbox";

interface RecipeAssetsProps {
  slug: string;
  recipeId: string;
  edit?: boolean;
  value: RecipeAsset[];
  onChange: (value: RecipeAsset[]) => void;
}

interface NewAsset {
  name: string;
  icon: string;
}

function isImage(fileName?: string | null) {
  if (!fileName) return false;
  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(fileName);
}

export function RecipeAssets({ slug, recipeId, edit = true, value, onChange }: RecipeAssetsProps) {
  const { t } = useI18n();
  const api = useUserApi();
  const { copyText } = useCopy();
  const { recipeAssetPath } = useStaticRoutes();
  const model = value ?? [];

  const [newAssetDialog, setNewAssetDialog] = useState(false);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [newAsset, setNewAsset] = useState<NewAsset>({ name: "", icon: "mdi-file" });
  const [menu, setMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);

  const iconOptions = [
    {
      name: "mdi-file",
      title: t("asset.file"),
      icon: icons.file,
    },
    {
      name: "mdi-file-pdf-box",
      title: t("asset.pdf"),
      icon: icons.filePDF,
    },
    {
      name: "mdi-file-image",
      title: t("asset.image"),
      icon: icons.fileImage,
    },
    {
      name: "mdi-code-json",
      title: t("asset.code"),
      icon: icons.codeJson,
    },
    {
      name: "mdi-silverware-fork-knife",
      title: t("asset.recipe"),
      icon: icons.primary,
    },
  ];

  const serverBase = window.location.origin;

  function getIconDefinition(icon: string) {
    return iconOptions.find(item => item.name === icon) || iconOptions[0]!;
  }

  const [lightbox, setLightbox] = useState<{ open: boolean; imageUrl?: string; imageAlt?: string }>({ open: false });

  function assetURL(assetName: string) {
    return recipeAssetPath(recipeId, assetName);
  }

  function assetEmbed(name: string) {
    return `<img src="${serverBase}${assetURL(name)}" height="100%" width="100%" />`;
  }

  function openLightbox(item: RecipeAsset) {
    setLightbox({ open: true, imageUrl: assetURL(item.fileName ?? ""), imageAlt: item.name });
  }

  function handleViewClick(event: SyntheticEvent, item: RecipeAsset) {
    if (!isImage(item.fileName)) {
      return;
    }

    event.preventDefault();
    openLightbox(item);
  }

  // The row itself only opens the lightbox outside edit mode; the menu's view action
  // (which exists only while editing) goes straight to handleViewClick.
  function handleRowClick(event: SyntheticEvent, item: RecipeAsset) {
    if (edit) {
      return;
    }

    handleViewClick(event, item);
  }

  function setUploadedFile(file: File) {
    setFileObject(file);
    // If the user didn't provide a name, default to the file base name
    if (!newAsset.name?.trim()) {
      setNewAsset(prev => ({ ...prev, name: file.name.substring(0, file.name.lastIndexOf(".")) }));
    }
  }

  function validFields() {
    // Only require a file; name will fall back to the file name if empty
    return Boolean(fileObject?.name);
  }

  async function addAsset() {
    if (!validFields() || !fileObject) {
      alert.error(t("asset.error-submitting-form"));
      return;
    }

    const nameToUse = newAsset.name?.trim() || fileObject.name;

    const { data } = await api.recipes.createAsset(slug, {
      name: nameToUse,
      icon: newAsset.icon,
      file: fileObject,
      extension: fileObject.name.split(".").pop() || "",
    });
    if (data) {
      onChange([...model, data]);
    }
    setNewAsset({ name: "", icon: "mdi-file" });
    setFileObject(null);
  }

  if (!(model.length > 0 || edit)) {
    return null;
  }

  const menuItem = menu ? model[menu.index] : undefined;

  return (
    <div>
      <Card sx={{ mt: 4 }}>
        <ListItem
          sx={{ pr: 1, pl: 0 }}
          secondaryAction={edit
            ? (
                <IconButton aria-label={t("asset.new-asset")} onClick={() => setNewAssetDialog(true)}>
                  <MdiIcon path={icons.create} />
                </IconButton>
              )
            : undefined}
        >
          <Typography variant="h6" component="div" sx={{ px: 2, py: 1 }}>
            {t("asset.assets")}
          </Typography>
        </ListItem>
        <Divider sx={{ mx: 1 }} />
        {model.length > 0 && (
          <List>
            {model.map((item, i) => {
              const linked = !edit && !isImage(item.fileName);
              const avatar = (
                <ListItemAvatar>
                  <Avatar variant="rounded" sx={{ width: 48, height: 48, boxShadow: 1, bgcolor: "transparent", color: "text.primary", mr: 2 }}>
                    {isImage(item.fileName)
                      ? (
                          <Box
                            component="img"
                            src={assetURL(item.fileName ?? "")}
                            alt={item.name}
                            loading="lazy"
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )
                      : <MdiIcon path={getIconDefinition(item.icon).icon} size="large" />}
                  </Avatar>
                </ListItemAvatar>
              );
              const actions = (
                <>
                  {edit && (
                    <IconButton
                      aria-label={t("general.menu")}
                      aria-haspopup="menu"
                      onClick={(event: MouseEvent<HTMLElement>) => setMenu({ anchor: event.currentTarget, index: i })}
                    >
                      <MdiIcon path={icons.dotsVertical} />
                    </IconButton>
                  )}
                  {!edit && (
                    <IconButton
                      component="a"
                      href={assetURL(item.fileName ?? "")}
                      download
                      aria-label={t("general.download")}
                      onClick={(event: MouseEvent) => event.stopPropagation()}
                    >
                      <MdiIcon path={icons.download} />
                    </IconButton>
                  )}
                </>
              );

              return (
                <ListItem key={i} disablePadding secondaryAction={actions} sx={{ pr: 1 }}>
                  {edit
                    ? (
                        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1, width: "100%" }}>
                          {avatar}
                          <ListItemText primary={item.name} />
                        </Box>
                      )
                    : linked
                      ? (
                          <ListItemButton component="a" href={assetURL(item.fileName ?? "")} target="_blank">
                            {avatar}
                            <ListItemText primary={item.name} />
                          </ListItemButton>
                        )
                      : (
                          <ListItemButton onClick={event => handleRowClick(event, item)}>
                            {avatar}
                            <ListItemText primary={item.name} />
                          </ListItemButton>
                        )}
                </ListItem>
              );
            })}
          </List>
        )}
      </Card>
      <Menu
        open={!!menu && !!menuItem}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { dense: true, sx: { minWidth: 220 } } }}
      >
        {menuItem && [
          isImage(menuItem.fileName)
            ? (
                <MenuItem
                  key="view"
                  onClick={(event) => {
                    handleViewClick(event, menuItem);
                    setMenu(null);
                  }}
                >
                  <ListItemIcon><MdiIcon path={icons.eye} /></ListItemIcon>
                  <ListItemText>{t("general.view")}</ListItemText>
                </MenuItem>
              )
            : (
                <MenuItem
                  key="view"
                  component="a"
                  href={assetURL(menuItem.fileName ?? "")}
                  target="_blank"
                  onClick={() => setMenu(null)}
                >
                  <ListItemIcon><MdiIcon path={icons.eye} /></ListItemIcon>
                  <ListItemText>{t("general.view")}</ListItemText>
                </MenuItem>
              ),
          <MenuItem
            key="download"
            component="a"
            href={assetURL(menuItem.fileName ?? "")}
            download
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <ListItemIcon><MdiIcon path={icons.download} /></ListItemIcon>
            <ListItemText>{t("general.download")}</ListItemText>
          </MenuItem>,
          <MenuItem
            key="copy"
            onClick={() => {
              copyText(assetEmbed(menuItem.fileName ?? ""));
              setMenu(null);
            }}
          >
            <ListItemIcon><MdiIcon path={icons.contentCopy} /></ListItemIcon>
            <ListItemText>{t("general.copy")}</ListItemText>
          </MenuItem>,
          <MenuItem
            key="delete"
            onClick={() => {
              const index = menu!.index;
              onChange(model.filter((_, idx) => idx !== index));
              setMenu(null);
            }}
          >
            <ListItemIcon><MdiIcon path={icons.delete} /></ListItemIcon>
            <ListItemText>{t("general.delete")}</ListItemText>
          </MenuItem>,
        ]}
      </Menu>
      {lightbox.open && (
        <RecipeImageLightbox
          open={lightbox.open}
          onOpenChange={open => setLightbox(prev => ({ ...prev, open }))}
          imageUrl={lightbox.imageUrl}
          imageAlt={lightbox.imageAlt}
        />
      )}
      <Box sx={{ display: "flex", ml: "auto", mt: 1 }}>
        <Box sx={{ flexGrow: 1 }} />
        <BaseDialog
          open={newAssetDialog}
          onOpenChange={setNewAssetDialog}
          title={t("asset.new-asset")}
          icon={getIconDefinition(newAsset.icon).icon}
          canSubmit
          onSubmit={() => void addAsset()}
        >
          <CardContent sx={{ pt: 2 }}>
            <TextField
              value={newAsset.name}
              onChange={event => setNewAsset(prev => ({ ...prev, name: event.target.value }))}
              label={t("general.name")}
              variant="filled"
              fullWidth
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", mr: 1, flexGrow: 1 }}>
                <MdiIcon path={getIconDefinition(newAsset.icon).icon} sx={{ mr: 1 }} />
                <TextField
                  select
                  value={newAsset.icon}
                  onChange={event => setNewAsset(prev => ({ ...prev, icon: event.target.value }))}
                  variant="filled"
                  size="small"
                  fullWidth
                >
                  {iconOptions.map(option => (
                    <MenuItem key={option.name} value={option.name}>
                      <ListItemIcon>
                        <MdiIcon path={option.icon} />
                      </ListItemIcon>
                      {option.title}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <AppButtonUpload
                post={false}
                fileName="file"
                textBtn={false}
                onUploaded={(payload) => {
                  if (payload instanceof File) {
                    setUploadedFile(payload);
                  }
                }}
              />
            </Box>
          </CardContent>
        </BaseDialog>
      </Box>
    </div>
  );
}
