// frontend/src/utils/globalToast.ts
// Bridge between non-React code (axios interceptors) and React NotificationContext
type ToastFn = (message: string, duration?: number) => void;

let _error: ToastFn = () => {};
let _warning: ToastFn = () => {};
let _info: ToastFn = () => {};

export const globalToast = {
  register(error: ToastFn, warning: ToastFn, info: ToastFn): void {
    _error = error;
    _warning = warning;
    _info = info;
  },
  error: (msg: string, duration?: number) => _error(msg, duration),
  warning: (msg: string, duration?: number) => _warning(msg, duration),
  info: (msg: string, duration?: number) => _info(msg, duration),
};
