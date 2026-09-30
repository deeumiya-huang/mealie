import type { UserOut } from "~/lib/api/types/user";
import { createStore, useStore } from "~/lib/store";
import type { Store } from "~/lib/store";
import { useNavigationWarning } from "~/hooks/use-navigation-warning";
import { useMealieAuth } from "~/hooks/use-mealie-auth";

export enum PageMode {
  EDIT = "EDIT",
  VIEW = "VIEW",
  COOK = "COOK",
}

export enum EditorMode {
  JSON = "JSON",
  FORM = "FORM",
}

interface PageStateData {
  slug: string;
  pageMode: PageMode;
  editMode: EditorMode;
  isParsing: boolean;
  imageKey: number;
}

/**
 * PageState encapsulates the state of the recipe page that is shared across components, so the
 * many components of the recipe page stay consistent. One store per recipe slug.
 */
export interface PageState {
  slug: string;
  imageKey: number;
  setImageKey: (key: number | ((prev: number) => number)) => void;

  pageMode: PageMode;
  editMode: EditorMode;

  /** true if the page is in edit mode and the editor is in form mode. */
  isEditForm: boolean;
  /** true if the page is in edit mode and the editor is in json mode. */
  isEditJSON: boolean;
  /** true if the page is in edit mode. */
  isEditMode: boolean;
  /** true if the page is in cook mode. */
  isCookMode: boolean;
  /** true if the recipe is currently being parsed. */
  isParsing: boolean;

  setMode: (v: PageMode) => void;
  setEditMode: (v: EditorMode) => void;
  toggleEditMode: () => void;
  toggleCookMode: () => void;
  toggleIsParsing: (v?: boolean) => void;
}

const memo: Record<string, Store<PageStateData>> = {};

function storeFor(slug: string): Store<PageStateData> {
  memo[slug] ??= createStore<PageStateData>({
    slug,
    pageMode: PageMode.VIEW,
    editMode: EditorMode.FORM,
    isParsing: false,
    imageKey: 1,
  });
  return memo[slug];
}

function actionsFor(store: Store<PageStateData>) {
  const { activateNavigationWarning, deactivateNavigationWarning } = useNavigationWarning();

  const setEditMode = (v: EditorMode) => store.patch({ editMode: v });

  return {
    setImageKey: (key: number | ((prev: number) => number)) =>
      store.patch({ imageKey: typeof key === "function" ? key(store.get().imageKey) : key }),
    toggleEditMode: () => setEditMode(store.get().editMode === EditorMode.FORM ? EditorMode.JSON : EditorMode.FORM),
    toggleCookMode: () => store.patch({ pageMode: store.get().pageMode === PageMode.COOK ? PageMode.VIEW : PageMode.COOK }),
    toggleIsParsing: (v?: boolean) => store.patch({ isParsing: v ?? !store.get().isParsing }),
    setEditMode,
    setMode: (toMode: PageMode) => {
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
      store.patch({ pageMode: toMode });
    },
  };
}

function derive(data: PageStateData, actions: ReturnType<typeof actionsFor>): PageState {
  return {
    ...data,
    ...actions,
    isEditForm: data.pageMode === PageMode.EDIT && data.editMode === EditorMode.FORM,
    isEditJSON: data.pageMode === PageMode.EDIT && data.editMode === EditorMode.JSON,
    isEditMode: data.pageMode === PageMode.EDIT,
    isCookMode: data.pageMode === PageMode.COOK,
  };
}

/** usePageState provides a common way to interact with shared state across the RecipePage component. */
export function usePageState(slug: string): PageState {
  const store = storeFor(slug);
  const data = useStore(store);
  return derive(data, actionsFor(store));
}

/** Non-reactive snapshot, for code outside components. */
export function getPageState(slug: string): PageState {
  const store = storeFor(slug);
  return derive(store.get(), actionsFor(store));
}

export function clearPageState(slug: string) {
  delete memo[slug];
}

/**
 * usePageUser provides a type-safe way to access the UserOut. If no user is logged in then an
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
