# System Architecture Documentation

This document describes the current state of the Reality-First, Registry-Governed Design System. It serves as the single source of architectural truth for the system as it exists today.

## 1. System Overview

This system is a **Registry-Governed Design System** managed by the Antigravity agent. It ensures that the visual design, technical implementation, and governance rules are in perfect synchronization.

### Problem Statement
Most design systems suffer from "drift," where the code implementation deviates from the design intent or documentation. Additionally, modern AI code generators often produce hallucinations or inconsistent UI patterns when left ungoverned.

### Strategic Differentiation
- **Drift Prevention**: Unlike Figma-only systems, this system treats the **Registry** and **Storybook** as the definitive truth. Any code change must be validated against the Registry rules.
- **Governed Generation**: Unlike standard AI code generators, Antigravity is restricted by an **MCP (Model Context Protocol) Server** that prevents the creation of components or layouts that violate architectural constraints.

### The `app-` Prefix Governance (Why it is needed)
The `app-` prefix is our **Namespace of Authority**. It is mandatory for the following reasons:
1. **Layer Discrimination**: Figma frames often contain hundreds of non-production layers (Rectangle 1, Vector 5). The `app-` prefix tells the Governance Engine exactly which layers represent **Official Design System Components**.
2. **Law Enforcement Trigger**: The system only checks for **Visual Violations** (Radius, Color, Spacing) on layers starting with `app-`.
3. **Agentic Mapping**: It provides a one-to-one mapping between a Figma name (`app-button`) and the production code (`app-button` selector in Angular), removing all ambiguity for the AI generator.

## 2. Current System Status

The system is fully operational with the following components and governance tools verified:

### Component Layers
- **Primitives**: Box, Text, Icon.
- **Data / Display**: Card, Table, Badge.
- **Inputs**: TextInput, Checkbox, RadioGroup.
- **Feedback**: Spinner, Skeleton, Banner, Toast.
- **Actions**: Button, IconButton.
- **Navigation**: Link, Breadcrumb, TopNav, SideNav.

### System Verification
- **Registry Synchronization**: Zero drift. All components in `design-system-web` match their definitions in `component-registry.json`.
- **Storybook**: Active and hosting reactive stories for all 19 components.
- **MCP Server**: Active and validating composition rules for page-level assemblies. MCP does not persist, generate, or mutate any UI.

## 3. Core Building Blocks

### Components
All components are built as **Angular Standalone Components**. They are encapsulated, used selectively where token-based styling requires global scope (ViewEncapsulation.None), and are designed to be purely presentational (Model A).

### component-registry.json
The **Registry** is the canonical "Law" of the system.
- **Governs**: Property types, enum values, required states, composition rules (can/cannot contain), and architectural constraints (e.g., "mustNotHandleRouting").
- **Does NOT Govern**: Internal business logic or external API integrations.

### Storybook
Storybook serves as the **Visual Truth**. It is used to verify the reactivity and visual integrity of components before they are formally registered.

### MCP Server
The **MCP Server** acts as a governance bridge.
- **Validates**: All page-level composition plans before implementation.
- **Never**: Modifies the codebase or the registry. It only provides a PASS/REJECT signal based on registry rules.

### Antigravity
**Antigravity** is the agentic orchestrator.
- **Role**: Implements components and composes pages according to user prompts and system rules.
- **Forbidden Actions**: Hallucinating components, bypassing MCP validation, or modifying the registry without running the synchronization audit.

## 4. System Flow (End-to-End)

### CASE A — Component Creation
How a new component is added to the system:
1. **Implementation**: Create TypeScript, HTML, and SCSS files following the standalone pattern.
2. **Mandatory Terminal Check**: Immediately run `npm run build` or `npm run storybook` check. If any TypeScript or build errors occur (e.g., `styleUrl` vs `styleUrls` mismatch), the Agent MUST resolve the error before proceeding.
3. **Storybook Verification**: Create a `.stories.ts` file and verify reactivity using Storybook Controls.
4. **Registry Update**: Add the component definition (props, category, constraints) to `component-registry.json`.
5. **Sync Check**: Run the `registry-sync-check.js` tool to confirm the implementation matches the registry exactly.
6. **Progress Status**: Update the user/task.md ONLY after terminal verification passes.

### CASE B — Page Composition (Interactive Generation)
1. **Prompting**: The user requests a page layout via direct prompt or Agent-synthesis.
2. **Planning**: Antigravity creates a layout plan using ONLY existing registry components.
3. **Validation**: The plan is sent to the MCP Server for structural approval.
4. **Interactive Implementation**: If approved, Antigravity generates a Storybook Page Story with **fully unlocked controls** (`args`). This allows the user to change text, colors (variants), images, and visibility directly in the Storybook UI.
5. **Figma JSON Flow**: When importing from Figma Design JSON, the Agent must translate the static JSON into a **Parametric Storybook Story**, ensuring all design tokens (colors, padding, content) are exposed as interactive controls.
6. **Media Policy**: Always use **publicly accessible image URLs** (Unsplash, etc.) or provided internal paths for content.
 - **Note**: The generation of static, non-interactive layouts is strictly discouraged. Every handoff MUST be a "Living" UI.

## 5. What the System Allows vs Disallows

### ALLOWED
- Composing complex pages using verified Registry components.
- Including external assets (e.g., Image URLs) for content.
- Adding external links for navigation.
- Incremental updates to existing page compositions.
- Manual Storybook verification.

### DISALLOWED
- Creating new Angular components via natural language prompts.
- Modifying `component-registry.json` without running a successful sync check.
- Bypassing the MCP validation step during planning.
- Injecting raw HTML or custom CSS outside the component scope.
- Using hallucinated UI components that do not exist in the Registry.

## 6. How to Run the System

Exectue these commands from the root directory:

- **Start Storybook**: `npm run storybook`
- **Start MCP Server (Direct Usage/Manual Validation)**: `node mcp-server.js`
- **Verify Registry Sync**: `node registry-sync-check.js`
- **Observe Validation Logs**: Check the terminal output from the sync check or the MCP validation script (`validate-login-page.js` for current page tasks).

## 7. How to Use the System (For a New Developer)

### Prompting Patterns
Prompts should focus on **Page Composition**.
- **Allowed**: "Create a dashboard with a SideNav and a Table," "Add a Banner to the top of the Login page."
- **Rejected**: "Create a new calendar component," "Change the internal CSS of the Button."

### Error Handling
- **Failed Sync**: If `registry-sync-check.js` fails, the implementation must be adjusted to match the Registry exactly.
- **MCP Rejection**: If the composition plan is rejected, check the MCP logs to see which components violated the `canContain` or `cannotContain` rules.

## 8. Architectural Boundaries (CRITICAL)

Separation of concerns is strictly enforced:

### Components vs Pages
- **Components** are atomic, standalone primitives defined in the Registry.
- **Pages** are non-reusable compositions of these components, existing only as Storybook Stories.

### Governance vs Generation
- **Governance** is static (Registry) and validated (MCP/Sync).
- **Generation** is dynamic (Antigravity) but must operate within the governance boundaries.

### Content vs Structure
- **Content** (labels, data, URLs) can be provided via prompts.
- **Structure** is rigid and dictated by the Registry's composition rules.
