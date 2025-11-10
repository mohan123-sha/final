# MASTER SOURCE: AI-Powered Component Instantiator System Documentation

## 1. System Overview
**Project Name:** Component Instantiator (AI-Powered Design System Pipeline)
**Goal:** To autonomously convert Figma designs into pixel-perfect, production-ready Angular components + Storybook documentation with zero human intervention.
**Core Philosophy:** "Figma is the Source of Truth." The system employs a **Visual Gatekeeper** to override AI hallucinations and enforce the exact visual properties (colors, layout, typography) defined in the design file.

---

## 2. Technology Stack & AI Engine
*   **AI Model:** Google Gemini 2.5 Flash (`gemini-2.5-flash`).
*   **Role:** The AI is used as a **Translation Engine** (Reasoning Agent), converting abstract "Design Intelligence Reports" (IR) into Angular/SCSS code.
*   **Framework Interface:** Node.js Backend Server.
*   **Frontend Target:** Angular v19 (Standalone Components).
*   **Documentation Target:** Storybook 8.

---

## 3. System Architecture & File Responsibilities

### Core Pipeline Files (The "Brain")

1.  **`code-generation-server.js` (The Conductor)**
    *   **Role:** The main API server (Express/Node.js).
    *   **Action:** Listens for requests from the Figma Plugin. Orchestrates the entire flow: Input Inference -> Prompt Building -> Gemini API -> Output Handling -> File Writing.
    *   **Port:** 3000.

2.  **`code-generator-pipeline.js` (The Orchestrator)**
    *   **Role:** Executes the linear pipeline logic.
    *   **Process:**
        1.  Receives raw Figma JSON.
        2.  Converts inputs (Stage 1 Design IR).
        3.  Calls `gemini-input-analyzer.js` (Stage 2 Input Inference).
        4.  Generates the Prompt (Stage 3).
        5.  Calls Gemini.
        6.  Passes result to the Output Handler.

3.  **`angular-prompt-builder.js` (The Architect)**
    *   **Role:** Constructs the massive context prompt sent to Gemini.
    *   **Action:** Converts the "Design IR" into a natural language instruction for the AI. It sets the rules (e.g., "Use Standalone Components", "No PrimeNG", "Strict SCSS").

4.  **`code-output-handler.js` (The Gatekeeper & Healer)**
    *   **CRITICAL FILE:** This is where the magic happens *after* the AI responds.
    *   **Role:** Validation, Sanitization, Healing, and Enforcement.
    *   **Key Modules:**
        *   **Visual Gatekeeper:** Enforces Figma colors/layout using `!important` overrides.
        *   **Smart Component Classification:** Decides validation strategy based on component type (Button vs. Card vs. Icon).
        *   **Sanitizer:** Strips hallucinated PrimeNG/Bootstrap code.
        *   **Content Healer:** Injects `{{ label }}` into empty buttons.
        *   **Selector Normalizer:** Fixes mismatching classes (e.g., `.my-btn` vs `.btn`).
        *   **Deep Fill Extraction:** Recursively finds background colors in nested Figma groups.

5.  **`figma-input-inference.js` / `gemini-input-analyzer.js`**
    *   **Role:** "Stage 2 Inference". Analyzes the design to guess the logical API of the component.
    *   **Action:** Infers `@Input()` properties like `label`, `disabled`, `variant`, `icon` before code is even written.

---

## 4. The Automation Flow (Step-by-Step)

### Step 1: Figma Extraction
*   **Actor:** Figma Plugin (UI).
*   **Action:** User selects a component in Figma and clicks "Generate".
*   **Data:** The plugin extracts a nested JSON representation of the nodes (Frames, Text, Rectangles) including all style properties (fills, strokes, auto-layout settings).

### Step 2: Input Processing & IR Generation
*   **Actor:** `code-generator-pipeline.js`.
*   **Action:** 
    *   The raw JSON is cleaned.
    *   **Design IR (Intermediate Representation)** is created. This simplifies complex Figma data into concepts like "Container", "Label", "Variant".
    *   **Input Inference:** The system guesses what properties the Angular component should have (e.g., if it finds a text layer named "Label", it adds an `@Input() label`).

### Step 3: AI Generation (The "Dream")
*   **Actor:** Gemini 2.5 Flash via `angular-prompt-builder.js`.
*   **Action:** The system sends a prompt: *"You are an expert Angular developer. Build a component based on this IR: { ... }. Use strict inputs."*
*   **Output:** Gemini returns raw strings of Code: `component.ts`, `component.html`, `component.scss`.

### Step 4: The Gatekeeper (The "Reality Check")
*   **Actor:** `code-output-handler.js`.
*   **Action:** The raw AI code is effectively "quarantined" and scrubbed.
    1.  **Sanitization:** Checks for banned imports (PrimeNG, External libs). Deletes them.
    2.  **Structural Validation:** Ensures `@Component`, `@Input`, and `standalone: true` exist.
    3.  **Content Healing:** Scans HTML. If it sees `<button class="btn"></button>`, it injects `{{ label }}` so the button isn't empty.
    4.  **Selector Normalization:** Aligns HTML classes with SCSS (renames `.custom-class` to `.btn` if needed).

### Step 5: Visual Enforcement (The "Law")
*   **Actor:** `visualGatekeeper` function (inside Buffer).
*   **Action:** It looks back at the **Original Figma Data**.
    *   **Deep Search:** Recursively finds the true background color (ignoring transparent wrappers).
    *   **Smart Strategy:**
        *   If **Button**: Enforces Background, Text Color, Padding, Radius.
        *   If **Card**: Enforces Background, Radius, Padding (leaves Text alone).
        *   If **Icon**: Enforces Fill Color.
    *   **Injection:** It appends a CSS block with `!important` to the SCSS file, guaranteeing the visual matches the design, regardless of what the AI wrote.

### Step 6: Storybook Generation
*   **Actor:** `code-output-handler.js`.
*   **Action:** Automatically generates a `*.stories.ts` file.
    *   Maps inferred inputs to Storybook controls (Knobs).
    *   Deduplicates inputs to prevent syntax errors.

### Step 7: Output Storage
*   **Location:** `c:\Users\fortv\OneDrive\Desktop\Component Instantiator\design-system-web\src\generated-components\`.
*   **Result:** A fully formed folder (e.g., `/buttondanger`) containing:
    *   `buttondanger.component.ts`
    *   `buttondanger.component.html`
    *   `buttondanger.component.scss`
    *   `buttondanger.stories.ts`

---

## 5. Security & Stability Protocols
*   **Direct Hex Mode:** We do not use semantic variables like `var(--primary)`. We use raw Hex codes (`#FF0000`) extracted from Figma to ensure zero external dependencies.
*   **Self-Healing:** The system never crashes on a bad AI response. It heals the code (adds missing imports, fixes syntax) and proceeds.
*   **Visual Gatekeeper:** The ultimate safety net. Even if the AI tries to make a button Blue, if Figma says Red, the Gatekeeper rewrites the CSS to make it Red.

---
*Created by Antigravity (Google DeepMind) for User.*
