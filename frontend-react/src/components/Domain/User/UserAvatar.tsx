import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useUserStore } from "~/hooks/store/use-user-store";

export interface UserAvatarProps {
  userId: string;
  list?: boolean;
  size?: string | number;
  tooltip?: boolean;
}

export function UserAvatar({ userId, list = false, size = "42", tooltip = true }: UserAvatarProps) {
  const [, setError] = useState(false);
  const auth = useMealieAuth();
  const { store: users } = useUserStore();
  const user = users.find(u => u.id === userId);
  const key = auth.user?.cacheKey ?? "";
  const imageURL = `/api/media/users/${userId}/profile.webp?cacheKey=${key}`;
  const px = list ? 40 : Number(size);

  if (!userId) return null;
  return (
    <Tooltip title={user?.fullName ?? ""} placement="right" disableHoverListener={!user || !tooltip}>
      <Avatar
        src={imageURL}
        alt={userId}
        sx={{ width: px, height: px }}
        slotProps={{ img: { onLoad: () => setError(false), onError: () => setError(true) } }}
      />
    </Tooltip>
  );
}

export default UserAvatar;
