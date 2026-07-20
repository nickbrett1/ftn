# Toddler POS Design System
### SwiftUI Constraint Rules — iPad Point-of-Sale

> **Audience**: 3-year-old users operating an iPad POS terminal.
> **Philosophy**: Toddlers slap screens. They do not read. They do not aim. They do not tap — they smash. Every rule below exists to make the interface idiot-proof for an adult, and joy-proof for a toddler.

---

## RULE 1: Touch Target Minimum — 120×120 Points

### 1.1 Absolute Minimum
- **EVERY tappable element MUST be at least 120×120 points** in both width and height.
- No exceptions. Buttons, icons, list rows, toggles — all 120×120 minimum.
- If content is smaller than 120×120, pad it. Never shrink the touch zone.

### 1.2 Primary Action Buttons
- Primary CTA buttons (e.g. Checkout, Pay, Done) must be **at least 200×120 points**.
- Full-width primary buttons must span the **entire usable width minus 32pt horizontal margins**.

### 1.3 SwiftUI Implementation Pattern
```swift
// ✅ CORRECT — Always apply .frame + .contentShape together
Button(action: onTap) {
    Image(systemName: "checkmark.circle.fill")
        .resizable()
        .scaledToFit()
        .frame(width: 80, height: 80)
        .frame(width: 120, height: 120) // Padding to guaranteed target
        .contentShape(Rectangle())
}

// ❌ FORBIDDEN — No raw icon buttons without explicit touch target padding
Button(action: onTap) {
    Image(systemName: "xmark")
        .font(.system(size: 24))
}
```

### 1.4 List Rows
- Every list row must have a minimum height of **120pt**.
- Use `.frame(minHeight: 120)` on the row's root view.

### 1.5 Spacing Between Targets
- Adjacent tappable elements must have **at least 24pt of non-interactive spacing** between their visual boundaries.
- Use `.padding()` of at minimum 12pt on each adjacent side.

---

## RULE 2: Iconography Over Text — No Text Labels on Interactive Controls

### 2.1 Primary Controls Must Use Icons Only
- Interactive controls (buttons, action items) must use **icons as the primary communication mechanism**.
- Text labels on buttons are **permitted only as a secondary supplement** below or beside the icon, never as the sole label.
- Icon size on a 120×120 button: **64–80pt**.

### 2.2 Approved Icon Catalogue
Use SF Symbols or the exact assets specified below. Do not invent custom label text.

| Action | SF Symbol | Notes |
|--------|-----------|-------|
| Confirm / Pay | `checkmark.circle.fill` | Always green (`ToddlerGreen`) |
| Cancel / Remove | `xmark.circle.fill` | Always red (`ToddlerRed`) |
| Scan Barcode | `barcode.viewfinder` | |
| Add Item | `plus.circle.fill` | |
| Delete Item | `minus.circle.fill` | |
| Back / Undo | `arrow.uturn.backward.circle.fill` | |
| Admin / Settings | `gearshape.fill` | |
| Basket / Cart | `cart.fill` | |
| Print | `printer.fill` | |

### 2.3 Payment UI — Stripe Reader M2, Not Apple Pay Sheet

This app does **not** implement a native Apple Pay sheet or use `PKPaymentButton` / `PassKit`. All payment is handled by the **Stripe Reader M2** physical card reader. When a customer taps their iPhone or Apple Watch to the reader, the contactless transaction (including Apple Pay) is processed entirely by the Stripe Terminal SDK and the reader's NFC hardware — no PassKit entitlement or Merchant ID is required from the app.

The payment interaction from the iPad UI perspective is:
- User taps the **Confirm / Pay** button (green `checkmark.circle.fill`, full `ToddlerButtonStyle`).
- The app calls the Stripe Terminal SDK to present the reader.
- The reader handles all subsequent payment UI (lights, beeps).
- On success, the app shows the `SuccessOverlay`.

### 2.4 Text Usage Rules
- Text may appear as **item names** in product cards only.
- Text must **never** be the sole affordance for a primary interactive element.
- When text supplements an icon button, use font size **≥ 18pt**, weight `.bold`.
- Maximum characters on a supplementary label: **12 characters** (toddler attention span constraint).

---

## RULE 3: High-Contrast, Vibrant Palette — Primary Color System

### 3.1 Color Tokens

All SwiftUI code **must** reference these named semantic tokens. Raw hex values are **forbidden** in view code.

```swift
// In DesignSystem/Colors.swift
extension Color {
    // ── Background ─────────────────────────────────────────────
    static let toddlerBackground     = Color(red: 0.97, green: 0.97, blue: 1.00) // Near-white
    static let toddlerSurface        = Color.white
    static let toddlerSurfaceRaised  = Color(red: 0.94, green: 0.95, blue: 0.99) // Light card

    // ── Primary — Cobalt Blue ───────────────────────────────────
    static let toddlerBlue           = Color(red: 0.09, green: 0.32, blue: 0.91) // #1752E8
    static let toddlerBlueDark       = Color(red: 0.05, green: 0.20, blue: 0.65) // #0D33A6

    // ── Confirm — Vivid Green ───────────────────────────────────
    static let toddlerGreen          = Color(red: 0.05, green: 0.72, blue: 0.29) // #0DB84A
    static let toddlerGreenDark      = Color(red: 0.02, green: 0.52, blue: 0.20) // #058534

    // ── Danger / Cancel — Vivid Red ─────────────────────────────
    static let toddlerRed            = Color(red: 0.92, green: 0.10, blue: 0.10) // #EB1919
    static let toddlerRedDark        = Color(red: 0.65, green: 0.04, blue: 0.04) // #A60A0A

    // ── Accent — Amber Yellow ───────────────────────────────────
    static let toddlerYellow         = Color(red: 1.00, green: 0.76, blue: 0.00) // #FFC200
    static let toddlerYellowDark     = Color(red: 0.80, green: 0.56, blue: 0.00) // #CC8F00

    // ── Neutral ─────────────────────────────────────────────────
    static let toddlerText           = Color(red: 0.08, green: 0.08, blue: 0.10) // Near-black
    static let toddlerTextSecondary  = Color(red: 0.40, green: 0.42, blue: 0.48)
    static let toddlerDivider        = Color(red: 0.85, green: 0.86, blue: 0.90)
    static let toddlerDisabled       = Color(red: 0.80, green: 0.82, blue: 0.86)
    static let toddlerDisabledText   = Color(red: 0.60, green: 0.62, blue: 0.66)
}
```

### 3.2 Contrast Rules
- **All text on colored backgrounds** must meet WCAG 2.1 AA minimum contrast ratio of **4.5:1**.
- **All icons on colored backgrounds** must meet a minimum contrast ratio of **3:1**.
- White icons on `toddlerBlue`, `toddlerGreen`, `toddlerRed`: ✅ Compliant.
- White icons on `toddlerYellow`: ❌ **Forbidden** — use `toddlerText` instead.

### 3.3 Button Color Semantics
| Button Role | Background | Icon/Label Color |
|-------------|------------|-----------------|
| Primary action (Confirm, Pay) | `toddlerGreen` | `.white` |
| Destructive action (Cancel, Remove) | `toddlerRed` | `.white` |
| Navigation / neutral | `toddlerBlue` | `.white` |
| Warning / secondary | `toddlerYellow` | `toddlerText` |
| Disabled (any role) | `toddlerDisabled` | `toddlerDisabledText` |

### 3.4 Background Rules
- Screen backgrounds: always `toddlerBackground`.
- Cards / surfaces: `toddlerSurface` with a shadow of `radius: 8, y: 4, color: .black.opacity(0.10)`.
- Modals / sheets: `toddlerSurface` with `cornerRadius: 32`.

---

## RULE 4: Exaggerated States — Squish Animations and Disabled Affordances

### 4.1 Press / Squish Animation
Every button **must** implement a physical squish on press. The scale must be perceptible to a 3-year-old.

```swift
// In DesignSystem/ToddlerButton.swift
struct ToddlerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.88 : 1.0)
            .opacity(configuration.isPressed ? 0.92 : 1.0)
            .animation(
                .spring(response: 0.22, dampingFraction: 0.55, blendDuration: 0),
                value: configuration.isPressed
            )
    }
}

// Usage — EVERY button must use this style
Button(action: onConfirm) { ... }
    .buttonStyle(ToddlerButtonStyle())
```

### 4.2 Bounce-in Appearance
- When new interactive elements appear on screen (e.g. a product card added to basket), they must **bounce in** using:

```swift
.scaleEffect(appeared ? 1.0 : 0.5)
.opacity(appeared ? 1.0 : 0.0)
.animation(.spring(response: 0.35, dampingFraction: 0.60), value: appeared)
```

### 4.3 Success State — Exaggerated Confirmation
- On successful payment or action completion, display a full-screen overlay containing:
  - A `checkmark.circle.fill` icon at **200×200pt** in `toddlerGreen`.
  - A **pulse/scale animation** cycling `1.0 → 1.15 → 1.0` with a 0.7s period.
  - Haptic feedback: `UIImpactFeedbackGenerator(style: .heavy)` on appearance.
  - The overlay must auto-dismiss after **2.0 seconds**.

```swift
// In DesignSystem/SuccessOverlay.swift
struct SuccessOverlay: View {
    @State private var pulse = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.50).ignoresSafeArea()
            Image(systemName: "checkmark.circle.fill")
                .resizable()
                .frame(width: 200, height: 200)
                .foregroundColor(.toddlerGreen)
                .scaleEffect(pulse ? 1.15 : 1.0)
                .animation(
                    .easeInOut(duration: 0.7).repeatForever(autoreverses: true),
                    value: pulse
                )
                .onAppear { pulse = true }
        }
    }
}
```

### 4.4 Disabled State Rules
- **Disabled buttons MUST NOT be invisible.** They must be visually present but clearly muted.
- Required disabled appearance:
  - Background: `toddlerDisabled`
  - Icon/label: `toddlerDisabledText`
  - Scale: **0.95** (slightly sunken to imply inactivity).
  - No press animation when disabled.
- Implementation:

```swift
Button(action: onTap) { ... }
    .buttonStyle(ToddlerButtonStyle())
    .disabled(!isEnabled)
    .opacity(isEnabled ? 1.0 : 1.0) // ⚠️ DO NOT use opacity for disabled — use color tokens above
    .scaleEffect(isEnabled ? 1.0 : 0.95)
    .animation(.easeOut(duration: 0.2), value: isEnabled)
```

### 4.5 Loading State
- When an async action is in progress (e.g. payment processing), the triggering button must:
  - Replace its icon with a `ProgressView()` of size **60×60pt**.
  - Remain **non-interactive** (`.disabled(true)`).
  - Apply a subtle **pulsing opacity**: `0.7 → 1.0 → 0.7` on a 1.2s loop.
- Never show a spinner in a separate modal unless the entire screen is blocked.

---

## RULE 5: Layout and Spacing Grid

### 5.1 Base Spacing Unit
- Base unit: **8pt**.
- All padding, margins, and gaps must be **multiples of 8**: `8, 16, 24, 32, 40, 48, 64`.
- Exception: icon internal padding may use `12pt` where necessary.

### 5.2 Screen Layout Zones
For a standard iPad layout (landscape orientation **required** for checkout screen):

```
┌──────────────────────────────────────────────────────────────────┐
│  Top Bar: 88pt height — Session info, total, admin access        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Item Grid: fills remaining height                               │
│  Columns: 3 (portrait) / 4 (landscape) — minimum cell 160×160pt │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Bottom Action Bar: 160pt height — Pay / Cancel CTAs             │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Orientation Lock
- The checkout screen **must be locked to landscape** via Info.plist `UISupportedInterfaceOrientations`.
- Admin screen may support both orientations.

---

## RULE 6: Typography

### 6.1 Font Scale
All type must use Dynamic Type with a **minimum floor**. No text may be smaller than its floor regardless of system settings.

| Role | SwiftUI Style | Minimum Size | Weight |
|------|--------------|--------------|--------|
| Product name (card) | `.title2` | 22pt | `.bold` |
| Price | `.title` | 28pt | `.heavy` |
| Top bar total | `.largeTitle` | 34pt | `.black` |
| Button supplementary label | `.headline` | 18pt | `.bold` |
| Admin body text | `.body` | 16pt | `.regular` |
| Caption / secondary | `.callout` | 15pt | `.medium` |

### 6.2 Font Family
- Use **SF Pro Rounded** (system font rounded variant) exclusively.
- Apply via: `.fontDesign(.rounded)` on the root view.
- Rounded letterforms are friendlier and more legible for young users.

```swift
// In the root App view
ContentView()
    .fontDesign(.rounded)
```

---

## RULE 7: Corner Radii

- All cards and surfaces: `cornerRadius: 24`.
- All buttons: `cornerRadius: 20`.
- Modal sheets: `cornerRadius: 32` on the top corners only.
- Icons within buttons: no clipping radius applied to the icon itself.
- **Zero sharp corners anywhere in the UI.** A toddler's world is round.

---

## RULE 8: Haptics

Every significant interaction must produce haptic feedback. This reinforces the physicality of the UI.

| Interaction | Haptic Type |
|-------------|-------------|
| Button tap (primary) | `UIImpactFeedbackGenerator(.heavy)` |
| Button tap (secondary/nav) | `UIImpactFeedbackGenerator(.medium)` |
| Item added to basket | `UIImpactFeedbackGenerator(.rigid)` |
| Item removed from basket | `UIImpactFeedbackGenerator(.soft)` |
| Payment success | `UINotificationFeedbackGenerator(.success)` |
| Payment failure / error | `UINotificationFeedbackGenerator(.error)` |
| Disabled button tapped | `UINotificationFeedbackGenerator(.warning)` |

---

## RULE 9: Error and Edge-Case States

### 9.1 Error Display
- Errors must **never** use toast messages, banners, or small inline text.
- Errors must display as a **full-screen modal** containing:
  - An `xmark.octagon.fill` icon at **160×160pt** in `toddlerRed`.
  - A single short message in `.title2` weight `.bold`, maximum 6 words.
  - A single retry/dismiss button at full `ToddlerButtonStyle`.

### 9.2 Empty State
- Empty basket: display a `cart.badge.plus` SF Symbol at **140×140pt** in `toddlerBlue`.
- No small helper text. No instructions. The icon is the only affordance.

### 9.3 Confirmation Dialogs
- Destructive actions (e.g. clear basket) must show a confirmation with exactly **two buttons only**:
  - ✅ Confirm: `toddlerGreen`, full width.
  - ❌ Cancel: `toddlerRed`, full width.
  - Both minimum 120pt height.
  - No text-only options.

---

## RULE 10: Forbidden Patterns

The following patterns are **absolutely prohibited** in any SwiftUI code targeting this interface:

| Forbidden | Reason |
|-----------|--------|
| `.font(.caption)` or smaller | Unreadable by any user |
| `Toggle()` without custom styling | Default toggle is too small |
| `TextField` on main checkout screen | Toddlers cannot type |
| `NavigationLink` rows shorter than 120pt | Tap target violation |
| `Alert` (system) for errors | Too small, no icon |
| `Text`-only buttons | Iconography rule violation |
| `Color(hex:)` or inline RGB | Use semantic token names only |
| Animations with duration > 0.5s | Toddlers lose attention |
| `opacity(0)` for disabled elements | Must remain visible |
| Landscape-to-portrait rotation on checkout | Orientation lock required |
| Any font weight below `.medium` | Legibility requirement |

---

## Appendix A: Component Checklist

Before submitting any SwiftUI component for review, verify all of the following:

- [ ] Every tappable element is ≥ 120×120pt (`.contentShape(Rectangle())` applied)
- [ ] No interactive element uses text as its sole label
- [ ] All colors reference semantic tokens (`toddlerBlue`, `toddlerGreen`, etc.)
- [ ] Primary buttons use `ToddlerButtonStyle` (squish animation)
- [ ] Disabled state uses `toddlerDisabled` background + `0.95` scale
- [ ] Success actions trigger `SuccessOverlay` + `.heavy` haptic
- [ ] Font design is `.rounded` from root
- [ ] All corners have radius ≥ 20
- [ ] No text smaller than 15pt minimum floor
- [ ] Haptic feedback implemented for all interaction types

---

## Appendix B: Design Tokens Quick Reference

```swift
// Spacing
let spacing8:  CGFloat = 8
let spacing16: CGFloat = 16
let spacing24: CGFloat = 24
let spacing32: CGFloat = 32
let spacing48: CGFloat = 48
let spacing64: CGFloat = 64

// Touch Targets
let touchTargetMinimum:   CGFloat = 120
let touchTargetPrimary:   CGFloat = 200
let touchTargetListRow:   CGFloat = 120
let touchTargetIconInner: CGFloat = 72    // icon inside a 120pt target

// Corner Radii
let radiusCard:   CGFloat = 24
let radiusButton: CGFloat = 20
let radiusModal:  CGFloat = 32

// Shadows
let shadowRadius: CGFloat = 8
let shadowY:      CGFloat = 4
let shadowOpacity: Float  = 0.10

// Typography floors
let fontFloorCaption:  CGFloat = 15
let fontFloorBody:     CGFloat = 16
let fontFloorButton:   CGFloat = 18
let fontFloorCard:     CGFloat = 22
let fontFloorPrice:    CGFloat = 28
let fontFloorTotal:    CGFloat = 34

// Animation
let animSpringResponse:  Double = 0.22
let animSpringDamping:   Double = 0.55
let animSuccessPulse:    Double = 0.70
let animSuccessDismiss:  Double = 2.00
```
