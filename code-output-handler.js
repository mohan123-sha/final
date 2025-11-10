// CODE OUTPUT HANDLER
// Parses Gemini response, validates code, and ensures Storybook compatibility
// Implements "Self-Healing Gatekeeper" logic, "Defensive Sanitizer", and "Semantic Injector"

/**
 * Parses Gemini response and extracts Angular files with Gatekeeper validation
 * @param {string} geminiResponse - Raw response from Gemini
 * @param {string} componentName - Name of the component
 * @param {Object} inferredInputs - Optional inferred inputs for injection
 * @returns {Object} Parsed files object
 */
function parseGeminiResponse(geminiResponse, componentName, inferredInputs = null, figmaNodeData = null) {
  const files = {
    typescript: null,
    html: null,
    scss: null,
    story: null,
    errors: []
  };

  try {
    console.log('🛡️ [Gatekeeper] Starting validation & healing process...');

    // 1. Extract files (hold in memory)
    files.typescript = extractCodeBlock(geminiResponse, 'typescript', componentName);
    files.html = extractCodeBlock(geminiResponse, 'html', componentName);
    files.scss = extractCodeBlock(geminiResponse, 'scss', componentName);

    // 🩹 SELF-HEALING: Fix broken templateUrl syntax immediately after extraction
    if (files.typescript && files.typescript.content) {
      let content = files.typescript.content;
      if (content.includes('templateUrl,') || content.match(/templateUrl\s*}/)) {
        console.warn("⚠️ [Gatekeeper] Fixing broken templateUrl syntax...");
        const fixedPath = `templateUrl: './${componentName.toLowerCase()}.component.html',`;
        content = content.replace(/templateUrl\s*,/g, fixedPath);
        content = content.replace(/templateUrl\s*}/g, fixedPath + '\n}');
        files.typescript.content = content;
      }
    }

    // Attempt extract story (likely missing, but check anyway)
    try {
      files.story = extractCodeBlock(geminiResponse, 'typescript', componentName + '.stories');
    } catch (e) {
      // Ignore missing story, we will heal it
    }

    // 🧹 SANITIZER: Strip framework dependencies (Safety Layer)
    if (files.typescript && files.html) {
      sanitizeFrameworkCode(files);
    }

    // 🔴🟢 SEMANTIC INJECTOR: DISABLED FOR DIRECT HEX MODE
    // if (files.html && files.scss) {
    //   enforceSemanticIntent(files, componentName);
    // }

    // 🎨 VISUAL GATEKEEPER: Enforce Figma Colors (Absolute Truth)
    // Runs even if no Figma data (using fallback) to ensure selectors are present
    if (files.scss) {
      visualGatekeeper(files, figmaNodeData);
    }

    // 🔗 SELECTOR NORMALIZER: Align SCSS with HTML
    if (files.html && files.scss) {
      normalizeSelectors(files);
    }

    // 🩹 CONTENT HEALER: Ensure buttons have text
    if (files.html && files.html.content) {
      healEmptyTags(files, inferredInputs);
    }

    // 2. Validate & Heal Component (Ensure @Input and structure)
    if (files.typescript && files.typescript.content) {
      files.typescript.content = validateAndHealComponent(
        files.typescript.content,
        inferredInputs?.inputs
      );
    }

    // 3. Validate & Heal Story (Ensure valid args)
    files.story = validateAndHealStory(
      files.story,
      files.typescript ? files.typescript.content : '',
      componentName,
      inferredInputs?.inputs
    );

    // 4. Final Structure Validation
    validateExtractedFiles(files, componentName);

  } catch (error) {
    console.error('❌ [Gatekeeper] Critical error:', error.message);
    files.errors.push(`Gatekeeper error: ${error.message}`);
  }

  return files;
}

/**
 * VISUAL GATEKEEPER: Enforces exact Figma colors, spacing, and typography overriding AI
 * @param {Object} files - Extracted files object
 * @param {Object} figmaNodeData - Figma source data
 */
function visualGatekeeper(files, figmaNodeData) {
  let styles = {
    hexColor: null,
    contrastColor: null,
    borderRadius: null,
    padding: null,
    fontSize: null,
    fontWeight: null
  };


  // 1. Color Extraction (Deep Search due to Frames/Groups)
  if (figmaNodeData) {
    const fillSource = findFillNode(figmaNodeData);
    if (fillSource) {
      console.log('🎨 [Visual Gatekeeper] Found Deep Color Source. Enforcing...');
      const validFill = fillSource.fill;
      styles.hexColor = rgbToHex(validFill.color.r, validFill.color.g, validFill.color.b);
      styles.contrastColor = getContrastColor(validFill.color.r, validFill.color.g, validFill.color.b);
    }
  }

  // 2. Layout Extraction (Padding & Radius)
  if (figmaNodeData) {
    // Border Radius
    if (figmaNodeData.cornerRadius !== undefined) {
      styles.borderRadius = `${figmaNodeData.cornerRadius}px`;
    }

    // Padding (AutoLayout)
    // Figma often provides these directly if Auto Layout is on
    const pt = figmaNodeData.paddingTop || 0;
    const pb = figmaNodeData.paddingBottom || 0;
    const pl = figmaNodeData.paddingLeft || 0;
    const pr = figmaNodeData.paddingRight || 0;

    // Only apply if any padding exists (avoid overriding with 0 if not meant to be layout container)
    if (pt > 0 || pb > 0 || pl > 0 || pr > 0) {
      styles.padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
    }
  }

  // 3. Typography Extraction (Find first relevant TEXT child)
  if (figmaNodeData && figmaNodeData.children) {
    const textNode = findTextNode(figmaNodeData);
    if (textNode) {
      if (textNode.fontSize) styles.fontSize = `${textNode.fontSize}px`;
      if (textNode.fontWeight) styles.fontWeight = textNode.fontWeight;
    }
  }

  // FALLBACKS & SEMANTIC SAFETY NET
  if (!styles.hexColor) {
    console.warn('⚠️ [Visual Gatekeeper] No Figma color found. Attempting Semantic Fallback...');

    // Check component context available in 'files' or passed argument? 
    // We need to update the function signature to accept componentName via the 'files' object or argument.
    // For now, let's assume strict defaults first, but we can look at the filename.
    const nameCheck = files.typescript?.fileName || '';

    if (nameCheck.includes('danger') || nameCheck.includes('delete') || nameCheck.includes('error')) {
      styles.hexColor = '#DC2626'; // Red 600
      styles.contrastColor = '#FFFFFF';
    } else if (nameCheck.includes('success') || nameCheck.includes('confirm')) {
      styles.hexColor = '#16A34A'; // Green 600
      styles.contrastColor = '#FFFFFF';
    } else if (nameCheck.includes('warn')) {
      styles.hexColor = '#CA8A04'; // Yellow 600
      styles.contrastColor = '#000000';
    } else if (nameCheck.includes('info')) {
      styles.hexColor = '#2563EB'; // Blue 600
      styles.contrastColor = '#FFFFFF';
    } else {
      styles.hexColor = '#333333'; // Default Dark Grey
      styles.contrastColor = '#FFFFFF';
    }
    console.log(`🎨 [Visual Gatekeeper] Fallback applied: ${styles.hexColor}`);
  }
  if (!styles.padding) styles.padding = '12px 24px'; // Default button padding
  if (!styles.borderRadius) styles.borderRadius = '8px'; // Default radius
  if (!styles.fontSize) styles.fontSize = '16px'; // Default font size

  console.log(`🎨 [Visual Gatekeeper] Enforcing: Color=${styles.hexColor}, Radius=${styles.borderRadius}, Padding=${styles.padding}`);

  // 4. SMART COMPONENT CLASSIFICATION & STRATEGY
  const lowerName = files.typescript?.fileName?.toLowerCase() || '';
  let selectors = '';
  let cssRules = '';

  if (lowerName.includes('button') || lowerName.includes('btn') || lowerName.includes('badge') || lowerName.includes('chip')) {
    // STRATEGY: BUTTON / BADGE / CHIP (Inline Elements)
    // Apply EVERYTHING (Bg, Text, Padding, Radius)
    selectors = ':host, button, .btn, .p-button, .badge, .chip';
    cssRules = `
      background-color: ${styles.hexColor} !important;
      border-color: ${styles.hexColor} !important;
      color: ${styles.contrastColor} !important;
      border-radius: ${styles.borderRadius} !important;
      padding: ${styles.padding} !important;
      font-size: ${styles.fontSize} !important;
      ${styles.fontWeight ? `font-weight: ${styles.fontWeight} !important;` : ''}
      
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1.5 !important;
    `;
  } else if (lowerName.includes('card') || lowerName.includes('panel') || lowerName.includes('container') || lowerName.includes('modal') || lowerName.includes('dialog')) {
    // STRATEGY: CARD / CONTAINER (Block Elements)
    // Apply Background & Structure. Relax Text & Padding to allow internal layout.
    selectors = ':host, .card, .panel, .container, .modal, .dialog';
    cssRules = `
      background-color: ${styles.hexColor} !important;
      border-radius: ${styles.borderRadius} !important;
      // Use the Padding as the container padding
      padding: ${styles.padding} !important;
      
      // Do NOT enforce global text color on cards (it kills internal hierarchy)
      // Do NOT enforce inline-flex (cards are block/flex containers)
      display: block !important; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important; // Add subtle shadow for cards
    `;
  } else if (lowerName.includes('icon') || lowerName.includes('svg')) {
    // STRATEGY: ICON
    // Apply Color to text/fill only.
    selectors = ':host, i, svg, .icon';
    cssRules = `
       color: ${styles.hexColor} !important;
       fill: ${styles.hexColor} !important;
       // Icons don't usually need padding/radius enforcement from the parent node
       display: inline-block !important;
     `;
  } else if (lowerName.includes('input') || lowerName.includes('field') || lowerName.includes('text')) {
    // STRATEGY: INPUT
    selectors = ':host, input, .input-field, textarea';
    cssRules = `
        border: 1px solid ${styles.hexColor} !important; // Use color for border
        border-radius: ${styles.borderRadius} !important;
        padding: ${styles.padding} !important;
        font-size: ${styles.fontSize} !important;
        background-color: #ffffff !important; // Inputs usually white
        color: #333333 !important;
      `;
  } else {
    // STRATEGY: DEFAULT / GENERIC
    // Safe middle ground
    selectors = ':host';
    cssRules = `
      background-color: ${styles.hexColor} !important;
      border-radius: ${styles.borderRadius} !important;
    `;
  }

  const overrideCss = `
// 🔒 VISUAL GATEKEEPER OVERRIDE (Strategy: ${lowerName})
${selectors} {
  ${cssRules}
  box-sizing: border-box !important;
}
`;

  files.scss.content += overrideCss;
}

/**
 * Helper to recursively find the first node with a visible SOLID fill
 */
function findFillNode(node) {
  if (node.fills && Array.isArray(node.fills)) {
    const validFill = node.fills.find(fill =>
      fill.type === 'SOLID' && fill.visible !== false && fill.color
    );
    if (validFill) return { node, fill: validFill };
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findFillNode(child);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper to traverse and find the first visible text node
 */
function findTextNode(node) {
  if (node.type === 'TEXT') return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findTextNode(child);
      if (found) return found;
    }
  }
  return null;
}

/**
 * CONTENT HEALER: Injects missing text bindings into empty interactive elements
 * @param {Object} files - Extracted files object
 * @param {Object} inferredInputs - Inferred inputs from Stage 2
 */
function healEmptyTags(files, inferredInputs) {
  let html = files.html.content;
  const inputs = inferredInputs?.inputs || [];

  // Find the best candidate for text content (label, text, caption, title)
  const textInput = inputs.find(i => ['label', 'text', 'caption', 'title', 'content'].includes(i.name.toLowerCase()));
  const bindingVar = textInput ? textInput.name : 'label'; // Default to 'label' if unknown

  // Regex for empty button: <button attributes...></button>  (ignoring whitespaces)
  // We use a safe regex that doesn't match if there's content inside
  const emptyButtonRegex = /(<button[^>]*>)\s*(<\/button>)/gi;

  if (html.match(emptyButtonRegex)) {
    console.warn(`🩹 [Content Healer] Detected empty <button>. Injecting {{ ${bindingVar} }}...`);
    // Inject the binding
    files.html.content = html.replace(emptyButtonRegex, `$1{{ ${bindingVar} }}$2`);
  }
}

/**
 * SELECTOR NORMALIZER: Scans HTML for class usage and updates SCSS to match
 * Fixes hallucinated classes like .my-custom-button vs .btn
 */
function normalizeSelectors(files) {
  const html = files.html.content;
  let scss = files.scss.content;
  let modified = false;

  // 1. Detect Standard ".btn" usage in HTML
  if (html.includes('class="btn') || html.includes("class='btn")) {
    // If SCSS does NOT have .btn but has other classes, assuming mismatch
    if (!scss.includes('.btn {') && !scss.includes('.btn:') && !scss.includes('.btn,')) {
      console.warn('🔧 [Selector Normalizer] HTML uses .btn but SCSS does not. Fixing mismatch...');

      // Heuristic: Find the first top-level custom class definition that isn't :host
      // This is risky but effective for "my-custom-button" type errors
      // Regex looks for ".some-name {"
      const match = scss.match(/^\.([a-z0-9-_]+)\s*\{/m);
      if (match && match[1] !== 'btn') {
        const hallucinatedClass = match[1];
        console.log(`🔧 [Selector Normalizer] Replacing .${hallucinatedClass} with .btn`);
        // Replace all instances
        const regex = new RegExp(`\\.${hallucinatedClass}`, 'g');
        scss = scss.replace(regex, '.btn');
        modified = true;
      }
    }
  }

  // 2. Detect missing :host wrapper (AI sometimes forgets it for Shadow DOM isolation)
  // If the extracted SCSS starts with a raw element selector like "div {" or "h1 {", prefer :host
  // (Skipping for now to avoid breaking intentional global styles)

  if (modified) {
    files.scss.content = scss;
  }
}

/**
 * Converts 0-1 range RGB to Hex string
 */
function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Determines text color (black/white) based on background luminance
 */
function getContrastColor(r, g, b) {
  // Calculate luminance
  const luminance = (0.299 * r * 255 + 0.587 * g * 255 + 0.114 * b * 255) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * SEMANTIC INJECTOR: Enforces Danger/Success styling based on component name
 * @param {Object} files - Extracted files object
 * @param {string} componentName - Name of the component
 */
function enforceSemanticIntent(files, componentName) {
  const lowerName = componentName.toLowerCase();

  // 🔴 DANGER / DELETE
  if (lowerName.includes('danger') || lowerName.includes('delete')) {
    console.log('🔴 [Semantic Injector] Detected DANGER intent. Enforcing red styling...');

    // 1. Force HTML class
    let html = files.html.content;
    if (html.includes('class="')) {
      html = html.replace(/btn-(primary|secondary)/g, 'btn-danger'); // Replace existing variants
      // If no variant was specific, ensure btn-danger is added (simplistic regex for now)
    }
    files.html.content = html;

    // 2. Append CSS
    const dangerCss = `
.btn-danger,
button.btn-danger {
  background-color: #DC2626 !important;
  color: #FFFFFF !important;
  border: none;
}`;
    files.scss.content += dangerCss;
  }

  // 🟢 SUCCESS
  else if (lowerName.includes('success')) {
    console.log('🟢 [Semantic Injector] Detected SUCCESS intent. Enforcing green styling...');

    // 1. Force HTML class
    let html = files.html.content;
    if (html.includes('class="')) {
      html = html.replace(/btn-(primary|secondary)/g, 'btn-success');
    }
    files.html.content = html;

    // 2. Append CSS
    const successCss = `
.btn-success,
button.btn-success {
  background-color: #16A34A !important;
  color: #FFFFFF !important;
  border: none;
}`;
    files.scss.content += successCss;
  }
}

/**
 * SANITIZER: Strips framework dependencies and enforces native HTML
 * @param {Object} files - Extracted files object
 */
function sanitizeFrameworkCode(files) {
  console.log('🧹 [Sanitizer] Scanning for framework hallucinations...');

  // 1. TypeScript Sanitization
  let tsCode = files.typescript.content;
  if (tsCode.includes('primeng') || tsCode.includes('Module}')) {
    console.warn('⚠️ [Sanitizer] Detected PrimeNG imports. Stripping...');

    // Remove import lines containing 'primeng'
    tsCode = tsCode.replace(/import.*primeng.*\n?/g, '');
    // Remove module imports like "ButtonModule" from imports arrays if standalone
    tsCode = tsCode.replace(/ButtonModule,?\s*/g, '');
    tsCode = tsCode.replace(/InputTextModule,?\s*/g, '');
    tsCode = tsCode.replace(/RippleModule,?\s*/g, '');
    tsCode = tsCode.replace(/StyleClassModule,?\s*/g, '');

    files.typescript.content = tsCode;
  }

  // 2. HTML Sanitization
  let htmlCode = files.html.content;
  if (htmlCode.includes('<p-') || htmlCode.includes('pButton')) {
    console.warn('⚠️ [Sanitizer] Detected PrimeNG tags. Converting to native HTML...');

    // Convert <p-button> to <button>
    // Regex matches <p-button ... label="Text" ...></p-button> OR <p-button ... >Text</p-button>
    htmlCode = htmlCode.replace(/<p-button([^>]*)>/g, (match, attrs) => {
      // Extract label if present
      const labelMatch = attrs.match(/label=['"]([^'"]+)['"]/);
      const label = labelMatch ? labelMatch[1] : '';

      // Extract click handler
      const clickMatch = attrs.match(/\(click\)=['"]([^'"]+)['"]/);
      const clickAttr = clickMatch ? ` (click)="${clickMatch[1]}"` : '';

      // Extract disabled
      const disabledMatch = attrs.match(/\[disabled\]=['"]([^'"]+)['"]/);
      const disabledAttr = disabledMatch ? ` [disabled]="${disabledMatch[1]}"` : '';

      // Determine class based on severity/variant (simple check)
      let btnClass = 'btn';
      if (attrs.includes('secondary')) btnClass += ' btn-secondary';
      else if (attrs.includes('ghost') || attrs.includes('text')) btnClass += ' btn-ghost';
      else btnClass += ' btn-primary';

      return `<button class="${btnClass}"${clickAttr}${disabledAttr}>${label}`;
    });

    htmlCode = htmlCode.replace(/<\/p-button>/g, '</button>');

    // Convert <p-inputText> to <input>
    htmlCode = htmlCode.replace(/<p-inputText([^>]*)>/g, '<input class="input-field"$1>');
    htmlCode = htmlCode.replace(/<\/p-inputText>/g, ''); // Self-closing usually, but just in case

    // Strip remaining p- prefixes if any
    htmlCode = htmlCode.replace(/<p-/g, '<');
    htmlCode = htmlCode.replace(/<\/p-/g, '</');

    files.html.content = htmlCode;
  }
}

/**
 * Validates component code and heals missing @Inputs
 * @param {string} tsCode - Original TS code
 * @param {Array} inputs - Inferred inputs
 * @returns {string} Healed TS code
 */
function validateAndHealComponent(tsCode, inputs) {
  if (!inputs || inputs.length === 0) return tsCode;

  // Check if @Input is present
  if (!tsCode.includes('@Input')) {
    console.warn('⚠️ [Gatekeeper] Validation failed: Missing @Input decorators');
    console.log('🔧 [Gatekeeper] Auto-correcting component...');
    return injectInferredInputs(tsCode, inputs);
  } else {
    console.log('✅ [Gatekeeper] Component validation passed (@Input detected)');
    return tsCode;
  }
}

/**
 * Validates or generates Storybook file
 * @param {Object|null} existingStory - Extracted story file or null
 * @param {string} tsCode - Component TS code (for context)
 * @param {string} componentName - Component name
 * @param {Array} inputs - Inferred inputs
 * @returns {Object} Healed Story file object
 */
function validateAndHealStory(existingStory, tsCode, componentName, inputs) {
  // If story exists and seems valid, return it (placeholder logic)
  if (existingStory && existingStory.content && existingStory.content.includes('Meta')) {
    console.log('✅ [Gatekeeper] Story validation passed (Meta detected)');
    return existingStory;
  }

  // If missing or invalid, generate it
  console.warn('⚠️ [Gatekeeper] Story mismatch/missing detected');
  console.log('🔧 [Gatekeeper] Regenerating Storybook args...');

  const pascalName = toPascalCase(componentName) + 'Component';
  const rawInputs = inputs || [];

  // Deduplicate inputs based on name to prevent Storybook syntax errors
  const uniqueInputsMap = new Map();
  rawInputs.forEach(input => {
    if (!uniqueInputsMap.has(input.name)) {
      uniqueInputsMap.set(input.name, input);
    }
  });
  const inputsToUse = Array.from(uniqueInputsMap.values());

  const argTypes = inputsToUse.reduce((acc, input) => {
    let controlType = 'text';
    let options = '';

    if (input.type === 'boolean') controlType = 'boolean';
    else if (input.type.includes('|')) {
      controlType = 'select'; // or radio
      // Extract options from union type 'a' | 'b'
      const opts = input.type.split('|').map(s => s.trim().replace(/['"]/g, ''));
      options = `, options: [${opts.map(o => `'${o}'`).join(', ')}]`;
    }

    return acc + `    ${input.name}: { control: '${controlType}'${options} },\n`;
  }, '');

  const defaultArgs = inputsToUse.reduce((acc, input) => {
    let def = input.defaultValue || (input.type === 'boolean' ? 'false' : "''");
    // Ensure string defaults are quoted if not already
    if (input.type === 'string' && !def.startsWith("'") && !def.startsWith('"')) {
      def = `'${def}'`;
    }
    return acc + `    ${input.name}: ${def},\n`;
  }, '');

  // Detect standalone
  const isStandalone = tsCode.includes('standalone: true');
  const moduleProp = isStandalone ? 'imports' : 'declarations';

  const storyContent = `import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { ${pascalName} } from './${componentName.toLowerCase()}.component';

const meta: Meta<${pascalName}> = {
  title: 'Generated/${toPascalCase(componentName)}',
  component: ${pascalName},
  decorators: [
    moduleMetadata({
      ${moduleProp}: [${pascalName}],
      imports: [] 
    }),
  ],
  argTypes: {
${argTypes}  },
  render: (args) => ({
    props: args,
  }),
};

export default meta;
type Story = StoryObj<${pascalName}>;

export const Default: Story = {
  args: {
${defaultArgs}  },
};`;

  return {
    fileName: `${componentName.toLowerCase()}.stories.ts`,
    content: storyContent,
    language: 'typescript',
    size: storyContent.length
  };
}

// ... (Existing helper functions extractCodeBlock, getFileExtension, etc.)
// Re-implementing them here to ensure full file content

function extractCodeBlock(response, language, componentName) {
  // Try to find code block with language identifier
  const codeBlockRegex = new RegExp(`\`\`\`${language}([\\s\\S]*?)\`\`\``, 'i');
  let match = response.match(codeBlockRegex);

  if (!match) {
    // Try alternative patterns
    const altPatterns = [
      new RegExp(`\`\`\`([\\s\\S]*?)\`\`\`.*${language}`, 'i'),
      new RegExp(`// ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i'),
      new RegExp(`<!-- ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i'),
      new RegExp(`/\\* ${componentName}.*\\.component\\.${getFileExtension(language)}([\\s\\S]*?)(?=\`\`\`|$)`, 'i')
    ];

    for (const pattern of altPatterns) {
      match = response.match(pattern);
      if (match) break;
    }
  }

  if (!match) {
    throw new Error(`No ${language} code block found`);
  }

  let content = match[1].trim();

  if (language === 'typescript' && !componentName.endsWith('.stories')) {
    content = fixAngularSyntax(content);
  }

  let fileName = `${componentName.toLowerCase()}.component.${getFileExtension(language)}`;
  if (componentName.endsWith('.stories')) {
    fileName = `${componentName.toLowerCase()}.ts`; // already includes .stories in name passed
  }

  return {
    fileName: fileName,
    content: content,
    language: language,
    size: content.length
  };
}

function getFileExtension(language) {
  const extensions = { typescript: 'ts', html: 'html', scss: 'scss', css: 'css' };
  return extensions[language] || 'txt';
}

function validateExtractedFiles(files, componentName) {
  const requiredFiles = ['typescript', 'html', 'scss', 'story'];
  requiredFiles.forEach(fileType => {
    if (!files[fileType]) {
      files.errors.push(`Missing ${fileType} file`);
    } else if (!files[fileType].content) {
      files.errors.push(`Empty ${fileType} file content`);
    }
  });

  // Existing validations...
  if (files.typescript && files.typescript.content) validateTypeScriptComponent(files.typescript.content, componentName, files.errors);
  if (files.html && files.html.content) validateHtmlTemplate(files.html.content, files.errors);
}

function validateTypeScriptComponent(content, componentName, errors) {
  if (!content.includes('@Component')) errors.push('TypeScript file missing @Component decorator');
  if (!content.match(/export\s+class\s+(\w+)/)) errors.push('TypeScript file missing export class');
  if (!content.includes('import') || !content.includes('@angular/core')) errors.push('TypeScript file missing Angular imports');
}

function validateHtmlTemplate(content, errors) {
  if (content.length < 10) errors.push('HTML template appears to be too short');
  // NOTE: We don't error on missing PrimeNG components in validation anymore because the sanitizer removes them!
  if (content.includes('button') && !content.includes('<button') && !content.includes('p-button')) {
    // Logic relaxed for native fallback
  }
}

function prepareFilesForExport(files, outputDir = './src/app/components') {
  const exportFiles = [];
  ['typescript', 'html', 'scss', 'story'].forEach(fileType => {
    if (files[fileType] && files[fileType].content) {
      exportFiles.push({
        path: `${outputDir}/${files[fileType].fileName}`,
        content: files[fileType].content,
        type: fileType
      });
    }
  });
  return exportFiles;
}

function cleanGeminiArtifacts(content) {
  return content
    .replace(/^(Here's the|Here is the|Generated).*?:\s*/i, '')
    .replace(/^\/\/\s*.*\.component\.(ts|html|scss)\s*\n/, '')
    .replace(/^<!--\s*.*\.component\.(ts|html|scss)\s*-->\s*\n/, '')
    .replace(/^\/\*\s*.*\.component\.(ts|html|scss)\s*\*\/\s*\n/, '')
    .replace(/\n\n(This|The above).*$/s, '')
    .trim();
}

function fixAngularSyntax(content) {
  return content.replace(/styleUrl:\s*['"`]([^'"`]+)['"`]/g, "styleUrls: ['$1']");
}

function injectInferredInputs(tsCode, inputs) {
  if (!inputs || inputs.length === 0) return tsCode;
  let modifiedCode = tsCode;

  // Ensure Input import
  if (!modifiedCode.includes('Input')) {
    if (modifiedCode.includes("from '@angular/core'")) {
      modifiedCode = modifiedCode.replace(/from '@angular\/core';/, "from '@angular/core';\nimport { Input } from '@angular/core';");
    } else {
      modifiedCode = "import { Input } from '@angular/core';\n" + modifiedCode;
    }
  } else if (!modifiedCode.match(/import\s*{[^}]*Input[^}]*}\s*from/)) {
    modifiedCode = modifiedCode.replace(/import\s*{([^}]*)}\s*from\s*['"]@angular\/core['"]/, (match, imports) => `import { ${imports}, Input } from '@angular/core'`);
  }

  const inputFields = inputs.map(input => {
    const defaultValue = input.default !== undefined
      ? ` = ${typeof input.default === 'string' ? `'${input.default}'` : input.default}`
      : '';
    return `  @Input() ${input.name}: ${input.type}${defaultValue};`;
  }).join('\n');

  const classStartRegex = /(export\s+class\s+.*\{)/;
  if (modifiedCode.match(classStartRegex)) {
    modifiedCode = modifiedCode.replace(classStartRegex, `$1\n  // Stage 2: Injected Inputs\n${inputFields}\n`);
  } else {
    console.warn('⚠️ [Output Handler] Could not find class definition to inject inputs');
  }
  return modifiedCode;
}

function generateParsingSummary(files) {
  const summary = { success: files.errors.length === 0, filesExtracted: 0, totalSize: 0, errors: files.errors, files: {} };
  ['typescript', 'html', 'scss', 'story'].forEach(fileType => {
    if (files[fileType]) {
      summary.filesExtracted++;
      summary.totalSize += files[fileType].size;
      summary.files[fileType] = { fileName: files[fileType].fileName, size: files[fileType].size, hasContent: !!files[fileType].content };
    }
  });
  return summary;
}

function toPascalCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '');
}

// Example usage and test data
const EXAMPLE_GEMINI_RESPONSE = `...`; // omitted for brevity

module.exports = {
  parseGeminiResponse,
  extractCodeBlock,
  getFileExtension,
  validateExtractedFiles,
  validateTypeScriptComponent,
  validateHtmlTemplate,
  prepareFilesForExport,
  cleanGeminiArtifacts,
  fixAngularSyntax,
  generateParsingSummary,
  EXAMPLE_GEMINI_RESPONSE
};