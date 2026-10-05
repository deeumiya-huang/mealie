// Usage: <UserAvatar userId={id} /> · <UserAvatar userId={id} list tooltip={false} /> — profile image with
// the user's name as tooltip.
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { useUserStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

interface UserAvatarProps {
  userId: string;
  list?: boolean;
  size?: string | number;
  tooltip?: boolean;
}

export function UserAvatar({ userId, list = false, size = "42", tooltip = true }: UserAvatarProps) {
  const auth = useMealieAuth();
  const { store: users } = useUserStore();
  const user = users.find(user => user.id === userId);

  // Note: the cache key changes when the user updates their profile image
  const key = auth.user?.cacheKey ?? "";
  const imageURL = `/api/media/users/${userId}/profile.webp?cacheKey=${key}`;

  if (!userId) {
    return null;
  }

  // Vuetify's default avatar is 40 px (list), otherwise `size`
  const px = list ? 40 : Number(size);

  return (
    <Tooltip title={user ? user.fullName : ""} placement="right" disableHoverListener={!user || !tooltip} disableFocusListener={!user || !tooltip} disableTouchListener={!user || !tooltip}>
      <Avatar src={imageURL} alt={userId} sx={{ width: px, height: px }} />
    </Tooltip>
  );
}
