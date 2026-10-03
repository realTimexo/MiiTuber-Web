export type BrowserFilePickerOptions = {
  accept?: string;
  multiple?: boolean;
};

const DB_NAME = "miituber-web";
const DB_VERSION = 1;
const RESOURCE_STORE = "resources";
const FFL_RESOURCE_KEY = "ffl-resource";

export function isRunningInTauri(): boolean {
  return false;
}

export function chooseBrowserFile(
  options: BrowserFilePickerOptions = {},
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept ?? "*/*";
    input.multiple = options.multiple ?? false;
    input.addEventListener(
      "change",
      () => resolve(input.files?.[0] ?? null),
      { once: true },
    );
    input.click();
  });
}

export async function chooseFileBytes(
  options: BrowserFilePickerOptions = {},
): Promise<{ file: File; bytes: Uint8Array } | null> {
  const file = await chooseBrowserFile(options);
  return file ? { file, bytes: new Uint8Array(await file.arrayBuffer()) } : null;
}

export function downloadText(
  filename: string,
  contents: string,
  contentType = "application/octet-stream",
): void {
  const url = URL.createObjectURL(new Blob([contents], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not open."));
    request.onupgradeneeded = () => {
      request.result.createObjectStore(RESOURCE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readStoredFflResource(): Promise<Uint8Array | null> {
  if (!("indexedDB" in window)) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RESOURCE_STORE, "readonly")
      .objectStore(RESOURCE_STORE)
      .get(FFL_RESOURCE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Stored resource could not be read."));
    request.onsuccess = () => {
      const value = request.result;
      resolve(value instanceof ArrayBuffer ? new Uint8Array(value) : value instanceof Uint8Array ? value : null);
      db.close();
    };
  });
}

export async function storeFflResource(bytes: Uint8Array): Promise<void> {
  if (!("indexedDB" in window)) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(RESOURCE_STORE, "readwrite")
      .objectStore(RESOURCE_STORE)
      .put(bytes.slice().buffer, FFL_RESOURCE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Resource could not be stored."));
    request.onsuccess = () => resolve();
  });
  db.close();
}

export type OutputChannelMessage =
  | { type: "ready" }
  | { type: "hidden" }
  | { type: "avatar"; payload: unknown }
  | { type: "background"; payload: unknown }
  | { type: "body"; payload: unknown }
  | { type: "pose"; payload: unknown };

export function createOutputChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel("miituber-clean-output");
}
