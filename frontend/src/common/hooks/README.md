# Shared Hooks

This folder contains custom hooks/composables that can be reused across features.

## Guidelines

- Hooks should encapsulate reusable logic
- Prefix hook names with `use` (e.g., `useLocalStorage`, `useFetch`)
- Document parameters and return values
- Handle cleanup in hooks that use subscriptions or timers

## Example Hook

```typescript
/**
 * useLocalStorage Hook
 * Syncs state with localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Hook implementation
}
```
