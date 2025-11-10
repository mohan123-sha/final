# Design System: Figma Component Construction Guide

This document provides exact technical specifications for building Figma components that pass the **Design Governance** scan. Following these rules ensures that your designs can be automatically converted into production-ready Angular code.

## 🏗️ Core Construction Rules
- **Naming Convention**: Component names MUST use the `app-` prefix (e.g., `app-button`).
- **Property Accuracy**: Property names in Figma must match the registry (e.g., `variant`, `disabled`).
- **Standard Scale**: Use a 4px/8px grid for all spacing.

---

## 1. Action Components

### 🔘 Button (`app-button`)
**Setup**: Frame or Auto Layout container with text.
- **Sizes**: Height: `40px`, Padding: `16px` (Horizontal) / `8px` (Vertical).
- **Radius**: `6px`.
- **Colors (Primary)**: 
  - Fill: `#3B82F6` (Blue)
  - Text: `#FFFFFF` (White)
- **Figma Properties**:
  - `variant` (Enum: `primary`, `secondary`, `danger`, `ghost`)
  - `disabled` (Boolean)
  - `loading` (Boolean)

### 🖱️ Icon Button (`app-icon-button`)
**Setup**: Perfect square or circle container with an icon.
- **Sizes**: `40px` x `40px`.
- **Radius**: `50%` (Circle).
- **Icon Size**: `18px`.
- **Colors**: Same as Button.
- **Figma Properties**:
  - `icon` (Text: CSS class name, e.g., `pi pi-check`)
  - `ariaLabel` (Text: Accessibility label)
  - `variant` (Enum: `primary`, `secondary`, `danger`, `ghost`)

---

## 2. Navigation Components

### 🔗 Link (`app-link`)
**Setup**: Text layer with optional icon.
- **Typography**: 14px, Medium (500).
- **Colors**:
  - Default: `#2563EB` (Blue)
  - Hover: Add underline + `#1D4ED8` (Dark Blue)
- **Figma Properties**:
  - `href` (Text: URL or anchor)
  - `variant` (Enum: `default`, `muted`)

### 🧭 Top Navigation (`app-top-nav`)
**Setup**: Header bar spanning the width of the screen.
- **Sizes**: Height: `64px`, Padding: `24px` (Horizontal).
- **Background**: `#FFFFFF`.
- **Border**: `1px solid #E2E8F0` (Bottom).
- **Figma Properties**:
  - `title` (Text: Brand or page title)
  - `bordered` (Boolean: Toggles bottom border)
- **Composition**: Can contain `app-link`, `app-button`, and `app-icon-button`.

### 📂 Side Navigation (`app-side-nav`)
**Setup**: Vertical bar on the left side.
- **Sizes**: Width: `260px` (Expanded) / `80px` (Collapsed).
- **Background**: `#F8FAFC`.
- **Figma Properties**:
  - `label` (Text: Sidebar header)
  - `collapsed` (Boolean: Toggles width)

---

## 🚨 Validation Lab: Pass/Fail Scenarios

Use these scenarios to demonstrate the **Governance Judge** during your demo:

| Scenario | In Figma | Result |
| :--- | :--- | :--- |
| **Pass** | `app-button` with `variant=primary` | 100% Score ✅ |
| **Fail (Nested)** | `app-button` inside an `app-button` | 50% Score - Illegal Nesting ❌ |
| **Fail (Naming)** | Component named `btn-main` | 80% Score - Unknown Component ❌ |
| **Fail (Props)** | Button with property `glow-effect` | 95% Score - Unknown Property ❌ |
