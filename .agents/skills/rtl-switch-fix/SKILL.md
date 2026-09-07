---
name: rtl-switch-fix
description: Fix shadcn/Radix Switch (and similar sliding toggles) rendering broken inside an RTL (dir="rtl") layout — thumb sits on the wrong side, drifts further outward when checked, or escapes the track. Use when a project is Hebrew/Arabic/RTL and a toggle looks misplaced.
---

# RTL Switch Fix

## Symptom

In a `dir="rtl"` app the shadcn `Switch` thumb starts flush to the right edge and, when
turned on, moves further right — visually leaving the track. Cause: Radix's Switch honors
the inherited text direction, so `translate-x-4` in the Tailwind classes is flipped/negated
against the thumb's already mirrored start position.

## Fix

Force the switch's own direction to LTR while leaving the rest of the layout RTL. Radix reads
`dir` from the nearest element/`DirectionProvider`, so setting it on the Root is enough.

In `src/components/ui/switch.tsx`:

1. Add `dir="ltr"` on `SwitchPrimitives.Root`, placed **after** `{...props}` so it cannot be
   overridden by a stray inherited prop.
2. Keep the thumb translate classes exactly as shadcn ships them
   (`data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0`).

Reference implementation: `references/switch.tsx`.

## Notes

- Do NOT "fix" this by flipping to `-translate-x-4` or by adding RTL variants — that breaks
  again the moment a component renders inside an LTR subtree.
- Track width and thumb translate must match: `w-9` + `h-4 w-4` thumb → `translate-x-4`.
  If the track size is customized, recompute (`translate = trackWidth - thumbWidth - 2*border`).
- Same pattern applies to other Radix sliding primitives that read direction (e.g. a custom
  toggle built on Radix) — scope `dir="ltr"` to the control, not the page.
- Verify visually at both states in the RTL page, not just by reading classes.
