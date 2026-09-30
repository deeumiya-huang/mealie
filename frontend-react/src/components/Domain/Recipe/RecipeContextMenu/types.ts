export interface ContextMenuIncludes {
  delete: boolean;
  edit: boolean;
  download: boolean;
  duplicate: boolean;
  mealplanner: boolean;
  shoppingList: boolean;
  print: boolean;
  printPreferences: boolean;
  share: boolean;
  recipeActions: boolean;
}

export interface ContextMenuItem {
  title: string;
  icon: string;
  color?: string;
  event: string;
  isPublic: boolean;
}

export const DEFAULT_CONTEXT_MENU_ITEMS: ContextMenuIncludes = {
  delete: true,
  edit: true,
  download: true,
  duplicate: false,
  mealplanner: true,
  shoppingList: true,
  print: true,
  printPreferences: true,
  share: true,
  recipeActions: true,
};
