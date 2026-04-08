import { vi } from "vitest";

/**
 * Registers module-level mocks for every Tauri JS SDK surface we touch.
 * Call this from vi.mock factories or in a test's beforeEach.
 *
 * Usage:
 *   vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
 */

export const invokeMock = vi.fn();
export const listenMock = vi.fn();
export const emitMock = vi.fn();
export const openDialogMock = vi.fn();
export const saveDialogMock = vi.fn();
export const storeGetMock = vi.fn();
export const storeSetMock = vi.fn();
export const storeSaveMock = vi.fn();

export class MockLazyStore {
  constructor(public filename: string) {}
  get = storeGetMock;
  set = storeSetMock;
  save = storeSaveMock;
}

export function resetTauriMocks() {
  invokeMock.mockReset();
  listenMock.mockReset();
  emitMock.mockReset();
  openDialogMock.mockReset();
  saveDialogMock.mockReset();
  storeGetMock.mockReset();
  storeSetMock.mockReset();
  storeSaveMock.mockReset();
}
