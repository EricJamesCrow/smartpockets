// Vite's `import.meta.glob` is used by vitest + convex-test to build the
// module map. This declaration file adds it to ImportMeta so tsc does not
// reject its usage in test files.

interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
