import { useMemo } from "react";
import { useNavigationWarning } from "@/hooks/use-navigation-warning";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { createStore, useStore, type Store } from "@/lib/store";
import type { UserOut } from "@/lib/api/types/user";

export enum PageMode {
  EDIT = "EDIT",
  VIEW = "VIEW",
  COOK = "COOK",
}

export enum EditorMode {
  JSON = "JSON",
  FORM = "FORM",
}

/**
 * PageState encapsulates the state of the recipe page the can be shared across components.
 * It allows and facilitates the complex state management of the recipe page where many components
 * need to share and communicate with each other and guarantee consistency.
 *
 * Vue exposed refs and ComputedRefs; here the values are plain (read from a per-slug module store,
 * so every component using the same slug re-renders together) and the writable `slug`/`imageKey`
 * refs are `imageKey` + `setImageKey`.
 */
export interface PageState {
  slug: string;
  imageKey: number;
  setImageKey: (v: number | ((prev: number) => number)) => void;

  pageMode: PageMode;
  editMode: EditorMode;

  /**
   * true is the page is in edit mode and the edit mode is in form mode.
   */
  isEditForm: boolean;
  /**
   * true is the page is in edit mode and the edit mode is in json mode.
   */
  isEditJSON: boolean;
  /**
   * true is the page is in view mode.
   */
  isEditMode: boolean;
  /**
   * true is the page is in cook mode.
   */
  isCookMode: boolean;
  /**
   * true if the recipe is currently being parsed.
   */
  isParsing: boolean;

  setMode: (v: PageMode) => void;
  setEditMode: (v: EditorMode) => void;
  toggleEditMode: () => void;
  toggleCookMode: () => void;
  toggleIsParsing: (v?: boolean) => void;
}

interface PageValues {
  slug: string;
  pageMode: PageMode;
  editMode: EditorMode;
  isParsing: boolean;
  imageKey: number;
}

type PageStore = Store<PageValues>;

const memo: Record<string, PageStore> = {};

function pageStore(slug: string): PageStore {
  return createStore<PageValues>({
    slug,
    pageMode: PageMode.VIEW,
    editMode: EditorMode.FORM,
    isParsing: false,
    imageKey: 1,
  });
}

function pageActions(
  store: PageStore,
  activateNavigationWarning: () => void,
  deactivateNavigationWarning: () => void,
) {
  const patch = (values: Partial<PageValues>) => store.set(current => ({ ...current, ...values }));

  const toggleEditMode = () => {
    if (store.get().editMode === EditorMode.FORM) {
      patch({ editMode: EditorMode.JSON });
      return;
    }
    patch({ editMode: EditorMode.FORM });
  };

  const toggleCookMode = () => {
    if (store.get().pageMode === PageMode.COOK) {
      patch({ pageMode: PageMode.VIEW });
      return;
    }
    patch({ pageMode: PageMode.COOK });
  };

  const toggleIsParsing = (v: boolean | null = null) => {
    if (v === null) {
      v = !store.get().isParsing;
    }

    patch({ isParsing: v });
  };

  const setEditMode = (v: EditorMode) => {
    patch({ editMode: v });
  };

  const setMode = (toMode: PageMode) => {
    const fromMode = store.get().pageMode;

    if (fromMode === PageMode.EDIT) {
      if (toMode === PageMode.VIEW) {
        setEditMode(EditorMode.FORM);
      }
      deactivateNavigationWarning();
    }
    else if (toMode === PageMode.EDIT) {
      activateNavigationWarning();
    }

    patch({ pageMode: toMode });
  };

  const setImageKey = (v: number | ((prev: number) => number)) => {
    patch({ imageKey: typeof v === "function" ? v(store.get().imageKey) : v });
  };

  return { toggleEditMode, toggleCookMode, toggleIsParsing, setEditMode, setMode, setImageKey };
}

/**
 * usePageState provides a common way to interact with shared state across the
 * RecipePage component.
 */
export function usePageState(slug: string): PageState {
  const { activateNavigationWarning, deactivateNavigationWarning } = useNavigationWarning();
  memo[slug] ??= pageStore(slug);
  const store = memo[slug];
  const values = useStore(store);

  const actions = useMemo(
    () => pageActions(store, activateNavigationWarning, deactivateNavigationWarning),
    [store, activateNavigationWarning, deactivateNavigationWarning],
  );

  return {
    slug: values.slug,
    pageMode: values.pageMode,
    editMode: values.editMode,
    imageKey: values.imageKey,

    ...actions,

    isEditForm: values.pageMode === PageMode.EDIT && values.editMode === EditorMode.FORM,
    isEditJSON: values.pageMode === PageMode.EDIT && values.editMode === EditorMode.JSON,
    isEditMode: values.pageMode === PageMode.EDIT,
    isCookMode: values.pageMode === PageMode.COOK,
    isParsing: values.isParsing,
  };
}

export function clearPageState(slug: string) {
  delete memo[slug];
}

/**
 * usePageUser provides a wrapper around auth that provides a type-safe way to
 * access the UserOut type from the context. If no user is logged in then an empty
 * object with all properties set to their zero value is returned.
 */
export function usePageUser(): { user: UserOut } {
  const auth = useMealieAuth();

  if (!auth.user) {
    return {
      user: {
        id: "",
        group: "",
        groupId: "",
        groupSlug: "",
        household: "",
        householdId: "",
        householdSlug: "",
        cacheKey: "",
        email: "",
      },
    };
  }

  return { user: auth.user };
}
