const IS_DEV = import.meta.env.DEV;

export function devError(...args: unknown[]): void {
  if (IS_DEV) console.error(...args);
}

export function devLog(...args: unknown[]): void {
  if (IS_DEV) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (IS_DEV) console.warn(...args);
}
