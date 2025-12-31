# Shared Components

This folder contains reusable UI components that are used across multiple features.

## Guidelines

- Components should be feature-agnostic
- Keep components focused on a single responsibility
- Document props and usage with JSDoc comments
- Include basic error handling

## Example Component Structure

```typescript
/**
 * Button Component
 * A reusable button with various styles
 */
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  // Component implementation
}
```
