# Chess Timer App - Style Guide

Derived from the macOS/iOS Calculator color palette using Digital Colour Meter sampling.

---

## Color Palette

| Token | RGB | Hex | Description |
|-------|-----|-----|-------------|
| `color-orange` | `rgb(255, 146, 0)` | `#FF9200` | Active player button fill |
| `color-orange-text` | `rgb(255, 250, 238)` | `#FFFAEE` | Text on orange (warm white tint) |
| `color-grey-button` | `rgb(64, 64, 64)` | `#404040` | Inactive player button fill |
| `color-background` | `rgb(30, 30, 30)` | `#1E1E1E` | App background |
| `color-text-primary` | `rgb(248, 248, 248)` | `#F8F8F8` | All button label text |
| `color-red-light` | `rgb(236, 103, 101)` | `#EC6765` | Cancel/destructive button fill |
| `color-red-dark` | `rgb(119, 52, 50)` | `#773432` | Cancel button pressed state / bottom shadow border |
| `color-yellow-light` | `rgb(242, 202, 68)` | `#F2CA44` | Warning button fill |
| `color-yellow-dark` | `rgb(122, 101, 34)` | `#7A6522` | Warning button pressed state / bottom shadow border |

---

## Corner Radius

These values are observed from the iOS Calculator, which this palette is sourced from.

### Buttons
- **Circular buttons** (player tap buttons, number keys): `borderRadius = height / 2`
  - These are perfect circles. Set equal width and height, then `borderRadius = 50%` (web) or half the dimension (native).
- **Wide/pill buttons** (e.g. time picker confirm, settings rows): `borderRadius = 12pt`
  - The top-row calculator buttons (AC, %, backspace) are wider than tall but still very rounded, sitting at roughly `50%` of their height as radius, which resolves to around `22-24pt` for a ~44-48pt tall button.

### Panels and cards
- **Player panel** (each half-screen block): `borderRadius = 24pt`
  - Matches the large rounded rectangle feel of the calculator container and iOS card sheets.
- **Modal / settings sheet**: `borderRadius = 20pt`
  - Standard iOS bottom sheet corner radius.
- **App container background**: no border radius needed (full bleed).

### Summary table

| Element | Corner Radius |
|---------|--------------|
| Player tap button (large, square container) | `height / 2` (full circle or large squircle) |
| Small action buttons (cancel, warning) | `12pt` |
| Wide pill buttons | `22pt` |
| Player panel card | `24pt` |
| Modal / sheet | `20pt` |

---

## Button Usage

### Active Player Button
- The player whose clock is currently running.
- Background: `#FF9200`
- Text: `#FFFFFF`
- Shape: large, takes up the majority of that player's half of the screen.

### Inactive Player Button
- The player waiting for their turn.
- Background: `#404040`
- Text: `#FFFFFF`
- Shape: same size and radius as the active button.

### Cancel Button
Use for: "Cancel", "Resign", "End Game", "Discard".
- Fill: `#EC6765`
- Pressed/shadow border (2-3pt bottom): `#773432`
- Text: `#FFFFFF`
- Radius: `12pt`

### Warning Button
Use for: "Reset", "Add Time", "Pause All".
- Fill: `#F2CA44`
- Pressed/shadow border (2-3pt bottom): `#7A6522`
- Text: `#1E1E1E` (dark text for contrast on yellow)
- Radius: `12pt`

---

## Layout

- The screen splits into two equal halves, one per player.
- The bottom player's panel is oriented normally. The top player's panel is rotated 180 degrees so each player faces their own button.
- Background behind both panels: `#1E1E1E`.
- A thin divider (1pt, `#404040` or transparent) can sit between the two panels to visually separate them.

---

## Typography

- Button labels: large, bold, white (`#FFFFFF`).
- Timer display: very large, bold, white. Suggested size: `72-96pt` to fill the panel.
- Use a monospaced or tabular-figures font variant so the timer digits don't shift width as they count down.
