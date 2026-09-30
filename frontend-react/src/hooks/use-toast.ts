import { createStore } from "~/lib/store";

export interface Toast {
  open: boolean;
  text: string;
  title: string | null;
  color: string;
  timeout?: number;
  action?: {
    onClick: VoidFunction;
    message?: string;
  };
}

export const toastAlert = createStore<Toast>({
  open: false,
  title: null,
  text: "Hello From The Store",
  color: "info",
});

export const toastLoading = createStore<Toast>({
  open: false,
  title: null,
  text: "Importing Backup",
  color: "success",
});

function setToast(toast: typeof toastAlert, text: string, title: string | null, color: string, options?: Partial<Toast>) {
  toast.set({
    open: true,
    text,
    title,
    color,
    timeout: options?.timeout,
    action: options?.action,
  });
}

export const loader = {
  info(text: string, title: string | null = null) {
    setToast(toastLoading, text, title, "info");
  },
  success(text: string, title: string | null = null) {
    setToast(toastLoading, text, title, "success");
  },
  error(text: string, title: string | null = null) {
    setToast(toastLoading, text, title, "error");
  },
  warning(text: string, title: string | null = null) {
    setToast(toastLoading, text, title, "warning");
  },
  close() {
    toastLoading.patch({ open: false });
  },
};

export const alert = {
  info(text: string, title: string | null = null, options?: Partial<Toast>) {
    setToast(toastAlert, text, title, "info", options);
  },
  success(text: string, title: string | null = null, options?: Partial<Toast>) {
    setToast(toastAlert, text, title, "success", options);
  },
  error(text: string, title: string | null = null, options?: Partial<Toast>) {
    setToast(toastAlert, text, title, "error", options);
  },
  warning(text: string, title: string | null = null, options?: Partial<Toast>) {
    setToast(toastAlert, text, title, "warning", options);
  },
  close() {
    toastAlert.patch({ open: false });
  },
};

/**
 * Reports a failed request that the axios interceptor left silent.
 *
 * The interceptor raises a toast only for errors that carry a Mealie error body. Anything else -
 * a rejection from the web server sitting in front of Mealie, a dropped connection, a timeout -
 * arrives without one, and would otherwise leave the user with no feedback at all.
 */
export function alertUnreportedError(error: { response?: { data?: { detail?: { message?: string } } } } | null, fallbackText: string) {
  if (error?.response?.data?.detail?.message) {
    return;
  }

  alert.error(fallbackText);
}
