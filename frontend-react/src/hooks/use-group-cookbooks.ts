import { useEffect, useState } from "react";
import { publicExploreApi, userApi } from "~/hooks/api";
import type { ReadCookBook } from "~/lib/api/types/cookbook";

/** Loads one cookbook by id or slug; passing a group slug switches to the public API. */
export const useCookbook = function (id: string | number, publicGroupSlug: string | null = null) {
  const [book, setBook] = useState<ReadCookBook | null>(null);

  useEffect(() => {
    let active = true;
    const api = publicGroupSlug ? publicExploreApi(publicGroupSlug).explore : userApi();
    void api.cookbooks.getOne(id).then(({ data }) => {
      if (active) setBook(data);
    });
    return () => {
      active = false;
    };
  }, [id, publicGroupSlug]);

  return { book, setBook };
};
