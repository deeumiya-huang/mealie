import { useState } from "react";
import type { MouseEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { RecipeAsset } from "~/lib/api/types/recipe";
import { useStaticRoutes, useUserApi } from "~/hooks/api";
import { useCopy } from "~/hooks/use-copy";
import { useI18n } from "~/hooks/use-global-i18n";
import { alert } from "~/hooks/use-toast";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { SelectInput, TextInput } from "~/components/global/form";
import { RecipeImageLightbox } from "./RecipeImageLightbox";

export interface RecipeAssetsProps {
  value: RecipeAsset[];
  onChange: (value: RecipeAsset[]) => void;
  slug: string;
  recipeId: string;
  edit?: boolean;
}

function isImage(fileName?: string | null) {
  if (!fileName) return false;
  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(fileName);
}

export function RecipeAssets({ value: model, onChange, slug, recipeId, edit = true }: RecipeAssetsProps) {
  const i18n = useI18n();
  const api = useUserApi();
  const { copyText } = useCopy();
  const { recipeAssetPath } = useStaticRoutes();
  const [newAssetDialog, setNewAssetDialog] = useState(false);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [newAsset, setNewAsset] = useState({ name: "", icon: "mdi-file" });
  const [lightbox, setLightbox] = useState<{ open: boolean; imageUrl?: string; imageAlt?: string }>({ open: false });
  const [menu, setMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);

  const iconOptions = [
    { name: "mdi-file", title: i18n.t("asset.file"), icon: icons.file },
    { name: "mdi-file-pdf-box", title: i18n.t("asset.pdf"), icon: icons.filePDF },
    { name: "mdi-file-image", title: i18n.t("asset.image"), icon: icons.fileImage },
    { name: "mdi-code-json", title: i18n.t("asset.code"), icon: icons.codeJson },
    { name: "mdi-silverware-fork-knife", title: i18n.t("asset.recipe"), icon: icons.primary },
  ];
  const getIconDefinition = (icon: string) => iconOptions.find(item => item.name === icon) || iconOptions[0]!;
  const assetURL = (assetName: string) => recipeAssetPath(recipeId, assetName);
  const assetEmbed = (name: string) => `<img src="${window.location.origin}${assetURL(name)}" height="100%" width="100%" />`;

  function handleViewClick(event: MouseEvent, item: RecipeAsset) {
    if (!isImage(item.fileName)) {
      window.open(assetURL(item.fileName ?? ""), "_blank");
      return;
    }
    event.preventDefault();
    setLightbox({ open: true, imageUrl: assetURL(item.fileName ?? ""), imageAlt: item.name });
  }

  async function addAsset() {
    // Only a file is required; the name falls back to the file name
    if (!fileObject?.name) {
      alert.error(i18n.t("asset.error-submitting-form"));
      return;
    }
    const nameToUse = newAsset.name?.trim() || fileObject.name;
    const { data } = await api.recipes.createAsset(slug, {
      name: nameToUse,
      icon: newAsset.icon,
      file: fileObject,
      extension: fileObject.name.split(".").pop() || "",
    });
    if (data) onChange([...model, data]);
    setNewAsset({ name: "", icon: "mdi-file" });
    setFileObject(null);
  }

  if (!(model.length > 0 || edit)) return null;

  return (
    <div>
      <Card sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", pr: 1 }}>
          <Typography variant="h6" sx={{ px: 2, py: 1.5, flex: 1 }}>{i18n.t("asset.assets")}</Typography>
          {edit && <IconButton onClick={() => setNewAssetDialog(true)}><Icon path={icons.create} /></IconButton>}
        </Box>
        <Divider sx={{ mx: 1 }} />
        {model.length > 0 && (
          <List>
            {model.map((item, i) => (
              <ListItemButton
                key={i}
                sx={{ pr: 1 }}
                onClick={(e) => {
                  // The row only opens the asset outside edit mode
                  if (!edit) handleViewClick(e, item);
                }}
              >
                <ListItemIcon sx={{ mr: 2 }}>
                  <Avatar variant="rounded" sx={{ width: 48, height: 48, boxShadow: 1, bgcolor: "action.hover", color: "text.primary" }}>
                    {isImage(item.fileName)
                      ? <img src={assetURL(item.fileName ?? "")} alt={item.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Icon path={getIconDefinition(item.icon).icon} size="large" />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText primary={item.name} />
                {edit
                  ? (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu({ anchor: e.currentTarget, index: i });
                        }}
                      >
                        <Icon path={icons.dotsVertical} />
                      </IconButton>
                    )
                  : (
                      <IconButton component="a" href={assetURL(item.fileName ?? "")} download onClick={e => e.stopPropagation()}>
                        <Icon path={icons.download} />
                      </IconButton>
                    )}
              </ListItemButton>
            ))}
          </List>
        )}
        <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { minWidth: 220 } } }}>
          {menu && (() => {
            const item = model[menu.index]!;
            return [
              <MenuItem key="view" dense onClick={(e) => { setMenu(null); handleViewClick(e, item); }}>
                <ListItemIcon><Icon path={icons.eye} /></ListItemIcon>
                <ListItemText>{i18n.t("general.view")}</ListItemText>
              </MenuItem>,
              <MenuItem key="download" dense component="a" href={assetURL(item.fileName ?? "")} download onClick={() => setMenu(null)}>
                <ListItemIcon><Icon path={icons.download} /></ListItemIcon>
                <ListItemText>{i18n.t("general.download")}</ListItemText>
              </MenuItem>,
              <MenuItem key="copy" dense onClick={() => { setMenu(null); copyText(assetEmbed(item.fileName ?? "")); }}>
                <ListItemIcon><Icon path={icons.contentCopy} /></ListItemIcon>
                <ListItemText>{i18n.t("general.copy")}</ListItemText>
              </MenuItem>,
              <MenuItem key="delete" dense onClick={() => { setMenu(null); onChange(model.filter((_a, j) => j !== menu.index)); }}>
                <ListItemIcon><Icon path={icons.delete} /></ListItemIcon>
                <ListItemText>{i18n.t("general.delete")}</ListItemText>
              </MenuItem>,
            ];
          })()}
        </Menu>
      </Card>
      {lightbox.open && (
        <RecipeImageLightbox open={lightbox.open} onOpenChange={open => setLightbox({ ...lightbox, open })} imageUrl={lightbox.imageUrl} imageAlt={lightbox.imageAlt} />
      )}
      <BaseDialog
        open={newAssetDialog}
        onOpenChange={setNewAssetDialog}
        title={i18n.t("asset.new-asset")}
        icon={getIconDefinition(newAsset.icon).icon}
        canSubmit
        onSubmit={() => void addAsset()}
      >
        <CardContent sx={{ pt: 2 }}>
          <TextInput value={newAsset.name} onChange={name => setNewAsset({ ...newAsset, name })} label={i18n.t("general.name")} />
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <SelectInput
              value={newAsset.icon}
              onChange={icon => setNewAsset({ ...newAsset, icon: icon as string })}
              prependIcon={getIconDefinition(newAsset.icon).icon}
              items={iconOptions}
              itemTitle="title"
              itemValue="name"
              renderItem={item => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Icon path={item.icon} />
                  {item.title}
                </Box>
              )}
            />
            <AppButtonUpload
              post={false}
              fileName="file"
              textBtn={false}
              onUploaded={(f) => {
                const file = f as File;
                setFileObject(file);
                // If the user didn't provide a name, default to the file base name
                if (!newAsset.name?.trim()) {
                  setNewAsset(a => ({ ...a, name: file.name.substring(0, file.name.lastIndexOf(".")) }));
                }
              }}
            />
          </Box>
        </CardContent>
      </BaseDialog>
    </div>
  );
}

export default RecipeAssets;
