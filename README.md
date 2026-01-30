 AI-Powered Agentic Design System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stability: Stable](https://img.shields.io/badge/Stability-Stable-green.svg)]()
[![Platform: Figma](https://img.shields.io/badge/Platform-Figma-F24E1E.svg)]()
[![Frontend: Angular 19](https://img.shields.io/badge/Frontend-Angular%2019-DD0031.svg)]()

it is a next-generation, registry-governed design system designed to bridge the "Drift Gap" between Figma designs and production code. By leveraging agentic AI and structured governance, it automates the translation of design intent into pixel-perfect, compliant Angular components.

---

## 🌟 Key Pillars

- **Law of the Registry**: The [component-registry.json](file:///component-registry.json) serves as the immutable "Law Book," strictly governing properties, composition rules, and architectural constraints.
- **Visual Gatekeeper**: A post-AI validation layer ([code-output-handler.js](file:///code-output-handler.js)) that sanitizes AI-generated code and enforces Figma's exact visual properties.
- **MCP Governance**: Integration with Model Context Protocol (MCP) to validate page-level assemblies before a single line of code is written.

---

## 🚀 Architecture Overview

The system follows a modular "Brain" architecture:

- **The Conductor** ([code-generation-server.js](file:///code-generation-server.js)): Handles the Express API and orchestrates the end-to-end pipeline.
- **The Orchestrator** ([code-generator-pipeline.js](file:///code-generator-pipeline.js)): Manages the Design IR conversion and AI model communication.
- **The Architect** ([angular-prompt-builder.js](file:///angular-prompt-builder.js)): Constructs high-context, instructionally-dense prompts for the LLM.
- **The Judge** ([design-validator.js](file:///design-validator.js)): Scans Figma JSON for compliance against the Registry.

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **Figma Desktop App** (for plugin development)
- **Gemini API Key** (Google AI Studio)

### 1. Clone & Install
```bash
git clone https://github.com/mohan123-sha/final.git
cd final
npm install
```

### 2. Configure Environment
Create a `.env` file (excluded by .gitignore) in the root directory:
```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Start the Governance Servers
```bash
# Start the main code generation server (Port 3001)
npm run start-code-server
```

---

## 🎨 Figma Integration (Plugin Setup)

To use the Antigravity Agent inside Figma:

1. Open **Figma Desktop**.
2. Go to **Plugins** > **Development** > **Import plugin from manifest...**.
3. Select the [manifest.json](file:///manifest.json) file in this repository.
4. The plugin UI ([ui.html](file:///ui.html)) will now be available in your development menu.

---

## 📦 Core Workflow: Design-to-Code

### Step 1: Design Validation
Select a component in Figma (must use the `app-` prefix, e.g., `app-button`). The **Design Validator** will scan the node and score it based on the Registry rules.

### Step 2: Handoff Extraction
Once the design attains a **100% Compliance Score**, the plugin generates a "Machine-Readable Design IR" (Figma JSON).

### Step 3: Agentic Generation
The JSON is sent to the **Code Generation Server**. The Agent:
- Infers component inputs (Stage 2 Inference).
- Generates Angular Standalone code.
- Sanitizes and heals the output via the **Visual Gatekeeper**.

### Step 4: Verification
The system automatically updates the registry sync status using [registry-sync-check.js](file:///registry-sync-check.js).

---

## 🔍 Technical Implementation Standards

- **Standalone Architecture**: All generated components are Angular 19 Standalone.
- **Type Safety**: Full TypeScript implementation with strict `tsconfig.json` rules.
- **Registry Enforcement**: Composition rules (e.g., `canContain`) are validated via [mcp-server.js](file:///mcp-server.js).
- **Security Pruning**: All history is scrubbed for keys and logs to meet Linux Foundation LFX standards.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](file:///LICENSE) file for details.


