// MAIN CODE GENERATOR PIPELINE
// Orchestrates the complete flow from Figma Design IR to Angular code

const { convertToDesignIR, validateDesignIR } = require('./design-ir');
const { COMPONENT_MAPPING, validateComponentMappings, getRequiredImports } = require('./component-mapping');
const { buildAngularPrompt, validatePromptInputs } = require('./angular-prompt-builder');
const { parseGeminiResponse, generateParsingSummary, prepareFilesForExport } = require('./code-output-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { analyzeInputs } = require('./input-inference/gemini-input-analyzer');
const { validateComposition } = require('./mcp-server');


// Configuration
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash-lite',
  apiKey: process.env.GEMINI_API_KEY || '', // Use environment variable for security
};

/**
 * Main pipeline function - converts Figma layout to Angular code
 * @param {Object} figmaLayoutJSON - Layout JSON from existing Figma pipeline
 * @param {string} screenName - Name for the generated component
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {Object} Complete code generation result
 */
async function generateAngularCode(figmaLayoutJSON, screenName = "GeneratedScreen", figmaNode = null) {
  const result = {
    success: false,
    designIR: null,
    generatedFiles: null,
    summary: null,
    errors: [],
    inputInference: null
  };

  try {
    // Sanitize screenName to ensure valid TypeScript identifier
    // 1. Remove leading numbers
    // 2. Remove non-alphanumeric characters
    // 3. Ensure it starts with a letter (prefix 'Component' if needed)
    let sanitizedScreenName = screenName.replace(/[^a-zA-Z0-9]/g, '');
    if (/^[0-9]/.test(sanitizedScreenName)) {
      sanitizedScreenName = 'Component' + sanitizedScreenName;
    }
    // Fallback if empty after sanitization
    if (!sanitizedScreenName) {
      sanitizedScreenName = 'GeneratedScreen';
    }

    console.log('🚀 Starting Code Generator Pipeline');
    console.log(`📝 Screen Name: ${screenName} -> ${sanitizedScreenName}`);
    console.log(`📊 Input Components: ${figmaLayoutJSON.components?.length || 0}`);

    // STEP 1: Convert Figma data to Design IR
    console.log('📋 Step 1: Converting to Design IR...');
    result.designIR = convertToDesignIR(figmaLayoutJSON, sanitizedScreenName);
    validateDesignIR(result.designIR);
    console.log(`✅ Design IR created with ${result.designIR.components.length} components`);

    // STEP 2: Validate component mappings
    console.log('🗺️ Step 2: Validating component mappings...');
    validateComponentMappings(result.designIR.components);
    const requiredImports = getRequiredImports(result.designIR.components);
    console.log(`✅ All components mappable. Required imports: ${requiredImports.join(', ')}`);

    // STEP 2.5: MCP Validation (Agentic Design System Runtime)
    console.log('🟦 3️⃣ MCP Validation START (Critical Proof)');
    console.log('[MCP] Validation started');
    const validationErrors = [];

    // Validate section-level composition
    if (figmaLayoutJSON.sections) {
      figmaLayoutJSON.sections.forEach(section => {
        section.components.forEach(comp => {
          console.log(`[MCP] Checking: ${section.section_name} → ${comp.componentKey}`);
          const validation = validateComposition(section.section_name, comp.componentKey);
          if (!validation.valid) {
            console.log(`[MCP] ❌ FAILED: ${validation.reason}`);
            validationErrors.push(`[MCP Error] Section '${section.section_name}': ${validation.reason}`);
          } else {
            console.log(`[MCP] ✔ Allowed`);
          }
        });
      });
    } else if (figmaLayoutJSON.components) {
      // Fallback for flat component layouts
      figmaLayoutJSON.components.forEach(comp => {
        console.log(`[MCP] Checking: Root → ${comp.componentKey}`);
        const validation = validateComposition('main_content', comp.componentKey);
        if (!validation.valid) {
          console.log(`[MCP] ❌ FAILED: ${validation.reason}`);
          validationErrors.push(`[MCP Error] Root: ${validation.reason}`);
        } else {
          console.log(`[MCP] ✔ Allowed`);
        }
      });
    }

    if (validationErrors.length > 0) {
      console.log('🟦 4️⃣ MCP Validation RESULT');
      console.log('❌ [MCP] Validation result: FAILED');
      result.errors.push(...validationErrors);
      throw new Error(`MCP Validation Failed: ${validationErrors.join('; ')}`);
    }
    console.log('🟦 4️⃣ MCP Validation RESULT');
    console.log('✅ [MCP] Validation result: PASSED');
    console.log('✅ MCP Validation passed. Layout is legal.');

    // STEP 3: Build Gemini prompt (with optional Stage 2 input inference)
    console.log('🟦 5️⃣ Code Generation START');
    console.log('[AG] Validation passed');
    console.log('[AG] Starting code generation process');
    console.log('🤖 Step 3: Building Gemini prompt...');
    validatePromptInputs(result.designIR);

    let inferredInputs = null;

    // 1️⃣ Introduce Semantic Input Path (Hard Override)
    if (figmaNode) {
      console.log('🤖 Stage 2 (Gemini) ENABLED');

      // 2️⃣ Extract Semantic Data (Minimal & Safe)
      const semanticDesignData = extractSemanticData(figmaNode, sanitizedScreenName);
      console.log('📊 Semantic Data Extracted:', JSON.stringify(semanticDesignData, null, 2));

      // Call Gemini Analyzer
      console.log('🤖 Gemini Analyzer Injected');
      inferredInputs = await analyzeInputs(semanticDesignData);

      // 4️⃣ Enforce Visibility via Logs
      if (inferredInputs && inferredInputs.inputs) {
        console.log(`🤖 Inputs used: ${inferredInputs.inputs.length}`);
        if (inferredInputs.inputs.length === 0) {
          console.warn('⚠️ No inputs inferred by Gemini');
        }
      }
    } else {
      console.log('📝 Stage 1 (Static)');
    }

    const prompt = buildAngularPrompt(result.designIR, COMPONENT_MAPPING, inferredInputs);
    console.log(`✅ Prompt built (${prompt.length} characters)`);

    // STEP 4: Call Gemini API
    console.log('🌟 Step 4: Calling Gemini API...');
    const geminiResponse = await callGeminiAPI(prompt);
    console.log(`✅ Gemini response received (${geminiResponse.length} characters)`);

    // STEP 5: Parse response and extract files
    console.log('📁 Step 5: Parsing response and extracting files...');
    // Pass inferredInputs and figmaLayoutJSON (as figmaNodeData) for visual fidelity
    result.generatedFiles = parseGeminiResponse(geminiResponse, sanitizedScreenName, inferredInputs, figmaLayoutJSON);
    result.summary = generateParsingSummary(result.generatedFiles);

    if (result.generatedFiles.errors.length > 0) {
      result.errors.push(...result.generatedFiles.errors);
      console.log(`⚠️ Parsing completed with ${result.generatedFiles.errors.length} errors`);
    } else {
      console.log(`✅ All files parsed successfully`);
    }

    // STEP 6: Prepare for export
    console.log('📦 Step 6: Preparing files for export...');
    const exportFiles = prepareFilesForExport(result.generatedFiles);
    result.exportFiles = exportFiles;
    console.log(`✅ ${exportFiles.length} files ready for export`);

    result.success = result.generatedFiles.errors.length === 0;
    console.log(`🎉 Pipeline completed. Success: ${result.success}`);

  } catch (error) {
    console.error('❌ Pipeline error:', error.message);
    result.errors.push(`Pipeline error: ${error.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Calls Gemini API with the generated prompt
 * @param {string} prompt - Complete prompt for code generation
 * @returns {string} Gemini response text
 */
async function callGeminiAPI(prompt) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.model });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.length < 100) {
      throw new Error('Gemini response too short or empty');
    }

    return text;

  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Simplified pipeline for testing - uses mock Gemini response
 * @param {Object} figmaLayoutJSON - Layout JSON from Figma
 * @param {string} screenName - Component name
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {Object} Test result
 */
async function testPipeline(figmaLayoutJSON, screenName = "TestScreen", figmaNode = null) {
  console.log('🧪 Running test pipeline (mock Gemini response)');

  // Sanitize screenName
  let sanitizedScreenName = screenName.replace(/[^a-zA-Z0-9]/g, '');
  if (/^[0-9]/.test(sanitizedScreenName)) {
    sanitizedScreenName = 'Component' + sanitizedScreenName;
  }
  if (!sanitizedScreenName) sanitizedScreenName = 'TestScreen';

  // EXPLICIT STAGE 2 CHECK
  if (figmaNode) {
    console.log('🔍 Stage 2 mode ENABLED in test pipeline');
    console.log('🔍 figmaNode provided:', figmaNode.name);
  } else {
    console.log('📝 Stage 1 mode in test pipeline');
  }

  try {
    // Steps 1-3: Same as main pipeline
    const designIR = convertToDesignIR(figmaLayoutJSON, sanitizedScreenName);
    validateDesignIR(designIR);
    validateComponentMappings(designIR.components);

    // Step 4: Use mock response instead of Gemini (with Stage 2 support)
    console.log('🔍 Calling mock generator with figmaNode:', !!figmaNode);
    const mockResponse = generateMockGeminiResponse(designIR, figmaNode);

    // Step 5: Parse mock response
    // In test mode, we might need to mock inferredInputs if figmaNode was present
    let mockInferredInputs = null;
    if (figmaNode && figmaNode.name && figmaNode.name.includes('Button')) {
      mockInferredInputs = { inputs: [{ name: 'label', type: 'string', default: 'Click Me' }] };
    }
    const generatedFiles = parseGeminiResponse(mockResponse, sanitizedScreenName, mockInferredInputs);
    const summary = generateParsingSummary(generatedFiles);

    return {
      success: generatedFiles.errors.length === 0,
      designIR,
      generatedFiles,
      summary,
      mockResponse,
      stage2Enabled: !!figmaNode
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stage2Enabled: !!figmaNode
    };
  }
}

/**
 * Generates a mock Gemini response for testing
 * @param {Object} designIR - Design IR object
 * @param {Object} figmaNode - Optional Figma node for Stage 2 input inference
 * @returns {string} Mock Gemini response
 */
function generateMockGeminiResponse(designIR, figmaNode = null) {
  const componentName = designIR.screenName.toLowerCase();

  // Stage 2: Generate inputs if figmaNode provided
  let inputDeclarations = '';
  let inputImports = '';

  if (figmaNode) {
    console.log('🔍 [Mock Generator] Stage 2 mode ENABLED - Generating inferred @Input()s');

    // Mock inference for testing without Gemini
    const inferredInputs = { inputs: [] };
    if (figmaNode.name && figmaNode.name.includes('Button')) {
      inferredInputs.inputs.push({ name: 'label', type: 'string', defaultValue: "'Click Me'" });
    }

    if (inferredInputs.inputs.length > 0) {
      inputDeclarations = '\n  // Stage 2: Inferred @Input() properties\n' +
        inferredInputs.inputs.map(i => `  @Input() ${i.name}: ${i.type} = ${i.defaultValue};`).join('\n');
      inputImports = ', Input';
      console.log(`✅ [Mock Generator] Generated ${inferredInputs.inputs.length} inferred inputs`);
    } else {
      console.log('⚠️ [Mock Generator] No inputs inferred from figmaNode');
    }
  } else {
    console.log('📝 [Mock Generator] Stage 1 mode - No input inference');
  }

  return `Here's the Angular component code:

\`\`\`typescript
import { Component${inputImports} } from '@angular/core';

@Component({
  selector: 'app-${componentName}',
  templateUrl: './${componentName}.component.html',
  styleUrls: ['./${componentName}.component.scss']
})
export class ${designIR.screenName}Component {${inputDeclarations}
  ${generateMockProperties(designIR.components)}

  ${generateMockMethods(designIR.components)}
}
\`\`\`

\`\`\`html
<div class="${componentName}-container">
  ${generateMockTemplate(designIR.components, figmaNode)}
</div>
\`\`\`

\`\`\`scss
.${componentName}-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-${designIR.tokens.spacing});
  padding: var(--spacing-lg);
}

${generateMockStyles(designIR.components)}
\`\`\``;
}

/**
 * Helper functions for mock response generation
 */
function generateMockProperties(components) {
  const properties = [];
  components.forEach(comp => {
    if (comp.type === 'input') {
      const propName = comp.label.toLowerCase().replace(/\s+/g, '') + 'Value';
      properties.push(`  ${propName} = '';`);
    }
  });
  return properties.join('\n');
}

function generateMockMethods(components) {
  const methods = [];
  components.forEach(comp => {
    if (comp.type === 'button') {
      const methodName = 'on' + comp.text.replace(/\s+/g, '') + 'Click';
      methods.push(`  ${methodName}() {\n    console.log('${comp.text} clicked');\n  }`);
    }
  });
  return methods.join('\n\n');
}

function generateMockTemplate(components, figmaNode = null) {
  const template = [];

  components.forEach(comp => {
    switch (comp.type) {
      case 'heading':
        template.push(`  <h1>${comp.text}</h1>`);
        break;
      case 'text':
        template.push(`  <p class="text-content">${comp.text}</p>`);
        break;
      case 'input':
        const propName = comp.label.toLowerCase().replace(/\s+/g, '') + 'Value';
        template.push(`  <p-inputText type="${comp.inputType}" placeholder="${comp.label}" [(ngModel)]="${propName}"></p-inputText>`);
        break;
      case 'button':
        const methodName = 'on' + comp.text.replace(/\s+/g, '') + 'Click';
        template.push(`  <p-button label="${comp.text}" severity="${comp.variant}" (click)="${methodName}()"></p-button>`);
        break;
    }
  });
  return template.join('\n');
}

function generateMockStyles(components) {
  return `
.text-content {
  color: var(--text-color);
  margin-bottom: var(--spacing-sm);
}

p-inputText {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

p-button {
  align-self: flex-start;
}`;
}

/**
 * Validates pipeline configuration
 * @returns {boolean} True if configuration is valid
 */
function validatePipelineConfig() {
  if (!GEMINI_CONFIG.apiKey) {
    throw new Error('Gemini API key not configured');
  }

  if (!GEMINI_CONFIG.model) {
    throw new Error('Gemini model not specified');
  }

  return true;
}

/**
 * Extracts semantic design data from a Figma node
 * @param {Object} figmaNode - The raw Figma node
 * @param {string} componentName - The component name
 * @returns {Object} Semantic data for Gemini
 */
function extractSemanticData(figmaNode, componentName) {
  const textNodes = [];
  const visualHints = [];

  function traverse(node) {
    if (node.type === 'TEXT' && node.characters) {
      textNodes.push(node.characters);
    }
    // Simple visual hints based on node names or types
    if (node.name && (node.name.toLowerCase().includes('primary') || node.name.toLowerCase().includes('active'))) {
      visualHints.push(node.name);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(figmaNode);

  return {
    componentName,
    textNodes: textNodes.slice(0, 5), // Limit to top 5 text nodes
    componentType: figmaNode.name || 'component',
    visualHints: [...new Set(visualHints)]
  };
}

// Example usage
const EXAMPLE_USAGE = `
// Example: Generate Angular code from Figma layout
const figmaLayout = {
  screenType: "mobile",
  components: [
    { componentKey: "heading", text: "Login" },
    { componentKey: "text_input", text: "Email" },
    { componentKey: "primary_button", text: "Sign In" }
  ]
};

const result = await generateAngularCode(figmaLayout, "Login");
console.log('Success:', result.success);
console.log('Files:', result.exportFiles);
`;

module.exports = {
  generateAngularCode,
  testPipeline,
  callGeminiAPI,
  generateMockGeminiResponse,
  validatePipelineConfig,
  GEMINI_CONFIG,
  EXAMPLE_USAGE,
  extractSemanticData
};