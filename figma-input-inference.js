// FIGMA INPUT INFERENCE ENGINE
// Stage 2: Rule-based inference of Angular @Input() properties from Figma design signals
// Non-AI, deterministic mapping based on Figma component structure

/**
 * Analyzes Figma component data and infers Angular @Input() properties
 * @param {Object} figmaNode - Figma component node data
 * @param {string} componentName - Name of the component being generated
 * @returns {Object} Inferred inputs configuration
 */
function inferAngularInputs(figmaNode, componentName) {
  console.log('🔍 [Input Inference] Starting inference for:', componentName);
  
  const inferredInputs = {
    inputs: [],
    templateBindings: [],
    imports: new Set(),
    warnings: []
  };

  try {
    // Rule 1: Text Node → @Input() label
    const labelInput = inferLabelInput(figmaNode);
    if (labelInput) {
      inferredInputs.inputs.push(labelInput.input);
      inferredInputs.templateBindings.push(labelInput.binding);
      console.log('✅ [Input Inference] Inferred label input:', labelInput.input.name);
    }

    // Rule 2: Boolean Properties → @Input() boolean
    const booleanInputs = inferBooleanInputs(figmaNode);
    booleanInputs.forEach(boolInput => {
      inferredInputs.inputs.push(boolInput.input);
      inferredInputs.templateBindings.push(boolInput.binding);
      console.log('✅ [Input Inference] Inferred boolean input:', boolInput.input.name);
    });

    // Rule 3: Variant Properties → Union-Type @Input()
    const variantInputs = inferVariantInputs(figmaNode);
    variantInputs.forEach(varInput => {
      inferredInputs.inputs.push(varInput.input);
      inferredInputs.templateBindings.push(varInput.binding);
      console.log('✅ [Input Inference] Inferred variant input:', varInput.input.name);
    });

    // Rule 4: Size Variants → @Input() size
    const sizeInput = inferSizeInput(figmaNode);
    if (sizeInput) {
      inferredInputs.inputs.push(sizeInput.input);
      inferredInputs.templateBindings.push(sizeInput.binding);
      console.log('✅ [Input Inference] Inferred size input:', sizeInput.input.name);
    }

    // Safety Rule: Never infer more than 3 inputs per component
    if (inferredInputs.inputs.length > 3) {
      console.log('⚠️ [Input Inference] Too many inputs inferred, limiting to 3');
      inferredInputs.inputs = inferredInputs.inputs.slice(0, 3);
      inferredInputs.templateBindings = inferredInputs.templateBindings.slice(0, 3);
      inferredInputs.warnings.push('Limited to 3 inputs per component (safety rule)');
    }

    console.log(`🎯 [Input Inference] Completed: ${inferredInputs.inputs.length} inputs inferred`);
    return inferredInputs;

  } catch (error) {
    console.error('❌ [Input Inference] Error during inference:', error.message);
    inferredInputs.warnings.push(`Inference error: ${error.message}`);
    return inferredInputs;
  }
}

/**
 * Rule 1: Infers label input from text nodes
 * @param {Object} figmaNode - Figma component node
 * @returns {Object|null} Label input configuration
 */
function inferLabelInput(figmaNode) {
  const textNodes = findTextNodes(figmaNode);
  
  // Must have exactly one visible text node
  if (textNodes.length !== 1) {
    return null;
  }

  const textNode = textNodes[0];
  const textContent = textNode.characters || textNode.name || 'Label';

  return {
    input: {
      name: 'label',
      type: 'string',
      defaultValue: `'${textContent}'`,
      decorator: '@Input()'
    },
    binding: {
      type: 'interpolation',
      target: 'text-content',
      expression: '{{ label }}'
    }
  };
}

/**
 * Rule 2: Infers boolean inputs from component properties
 * @param {Object} figmaNode - Figma component node
 * @returns {Array} Array of boolean input configurations
 */
function inferBooleanInputs(figmaNode) {
  const booleanInputs = [];
  const booleanProperties = ['disabled', 'active', 'selected', 'loading', 'visible'];

  // Check component properties for boolean-like names
  if (figmaNode.componentProperties) {
    Object.entries(figmaNode.componentProperties).forEach(([propName, propData]) => {
      const normalizedName = propName.toLowerCase();
      
      if (booleanProperties.some(boolProp => normalizedName.includes(boolProp))) {
        booleanInputs.push({
          input: {
            name: normalizedName,
            type: 'boolean',
            defaultValue: 'false',
            decorator: '@Input()'
          },
          binding: {
            type: 'property',
            target: `[${normalizedName}]`,
            expression: normalizedName
          }
        });
      }
    });
  }

  return booleanInputs;
}

/**
 * Rule 3: Infers variant inputs from component variants
 * @param {Object} figmaNode - Figma component node
 * @returns {Array} Array of variant input configurations
 */
function inferVariantInputs(figmaNode) {
  const variantInputs = [];

  if (figmaNode.componentProperties) {
    Object.entries(figmaNode.componentProperties).forEach(([propName, propData]) => {
      // Skip size variants (handled separately)
      if (propName.toLowerCase().includes('size')) {
        return;
      }

      // Check if it's a variant property with multiple options
      if (propData.type === 'VARIANT' && propData.variantOptions && propData.variantOptions.length > 1) {
        const variants = propData.variantOptions.map(option => `'${option.toLowerCase()}'`);
        const defaultVariant = variants[0];

        variantInputs.push({
          input: {
            name: propName.toLowerCase(),
            type: variants.join(' | '),
            defaultValue: defaultVariant,
            decorator: '@Input()'
          },
          binding: {
            type: 'class',
            target: `[class]`,
            expression: `'${propName.toLowerCase()}-' + ${propName.toLowerCase()}`
          }
        });
      }
    });
  }

  return variantInputs;
}

/**
 * Rule 4: Infers size input from size-related variants
 * @param {Object} figmaNode - Figma component node
 * @returns {Object|null} Size input configuration
 */
function inferSizeInput(figmaNode) {
  const sizeTokens = ['sm', 'md', 'lg', 'small', 'medium', 'large', 'xs', 'xl'];

  if (figmaNode.componentProperties) {
    for (const [propName, propData] of Object.entries(figmaNode.componentProperties)) {
      if (propName.toLowerCase().includes('size') && propData.type === 'VARIANT') {
        const sizeVariants = propData.variantOptions
          .filter(option => sizeTokens.some(token => option.toLowerCase().includes(token)))
          .map(option => `'${option.toLowerCase()}'`);

        if (sizeVariants.length > 0) {
          return {
            input: {
              name: 'size',
              type: sizeVariants.join(' | '),
              defaultValue: sizeVariants.includes("'md'") ? "'md'" : sizeVariants[0],
              decorator: '@Input()'
            },
            binding: {
              type: 'class',
              target: `[class]`,
              expression: `'size-' + size`
            }
          };
        }
      }
    }
  }

  return null;
}

/**
 * Finds all text nodes within a Figma component
 * @param {Object} node - Figma node to search
 * @returns {Array} Array of text nodes
 */
function findTextNodes(node) {
  const textNodes = [];

  function traverse(currentNode) {
    if (currentNode.type === 'TEXT' && currentNode.visible !== false) {
      textNodes.push(currentNode);
    }

    if (currentNode.children) {
      currentNode.children.forEach(child => traverse(child));
    }
  }

  traverse(node);
  return textNodes;
}

/**
 * Generates TypeScript code for inferred inputs
 * @param {Array} inputs - Array of input configurations
 * @returns {string} TypeScript input declarations
 */
function generateInputDeclarations(inputs) {
  if (inputs.length === 0) {
    return '';
  }

  const declarations = inputs.map(input => {
    return `  ${input.decorator} ${input.name}: ${input.type} = ${input.defaultValue};`;
  });

  return declarations.join('\n');
}

/**
 * Generates template bindings for inferred inputs
 * @param {Array} bindings - Array of binding configurations
 * @param {string} baseTemplate - Base template content
 * @returns {string} Enhanced template with bindings
 */
function generateTemplateBindings(bindings, baseTemplate) {
  let enhancedTemplate = baseTemplate;

  bindings.forEach(binding => {
    switch (binding.type) {
      case 'interpolation':
        // Replace static text with interpolation
        enhancedTemplate = enhancedTemplate.replace(
          />\s*([^<]+)\s*</g,
          `>{{ label }}<`
        );
        break;
      
      case 'property':
        // Add property binding to relevant elements
        enhancedTemplate = enhancedTemplate.replace(
          /<(p-button|button|input)/g,
          `<$1 ${binding.target}="${binding.expression}"`
        );
        break;
      
      case 'class':
        // Add class binding
        enhancedTemplate = enhancedTemplate.replace(
          /class="([^"]*)"/g,
          `class="$1" ${binding.target}="${binding.expression}"`
        );
        break;
    }
  });

  return enhancedTemplate;
}

/**
 * Validates inferred inputs against safety rules
 * @param {Object} inferredInputs - Inferred inputs configuration
 * @returns {Object} Validation result
 */
function validateInferredInputs(inferredInputs) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [...inferredInputs.warnings]
  };

  // Check input count limit
  if (inferredInputs.inputs.length > 3) {
    validation.errors.push('Too many inputs inferred (max 3 allowed)');
    validation.valid = false;
  }

  // Check for duplicate input names
  const inputNames = inferredInputs.inputs.map(input => input.name);
  const duplicates = inputNames.filter((name, index) => inputNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    validation.errors.push(`Duplicate input names: ${duplicates.join(', ')}`);
    validation.valid = false;
  }

  // Check for valid TypeScript types
  inferredInputs.inputs.forEach(input => {
    if (!input.type || input.type.trim() === '') {
      validation.errors.push(`Invalid type for input: ${input.name}`);
      validation.valid = false;
    }
  });

  return validation;
}

/**
 * Creates a summary of the inference process
 * @param {Object} inferredInputs - Inferred inputs configuration
 * @returns {Object} Inference summary
 */
function createInferenceSummary(inferredInputs) {
  return {
    inputCount: inferredInputs.inputs.length,
    inputNames: inferredInputs.inputs.map(input => input.name),
    bindingCount: inferredInputs.templateBindings.length,
    warnings: inferredInputs.warnings,
    hasLabel: inferredInputs.inputs.some(input => input.name === 'label'),
    hasVariants: inferredInputs.inputs.some(input => input.type.includes('|')),
    hasBooleans: inferredInputs.inputs.some(input => input.type === 'boolean')
  };
}

// Example usage and test data
const EXAMPLE_FIGMA_NODE = {
  type: 'COMPONENT',
  name: 'Button/Primary',
  children: [
    {
      type: 'TEXT',
      characters: 'Click Me',
      visible: true
    }
  ],
  componentProperties: {
    'Variant': {
      type: 'VARIANT',
      variantOptions: ['Primary', 'Secondary', 'Danger']
    },
    'Size': {
      type: 'VARIANT', 
      variantOptions: ['SM', 'MD', 'LG']
    },
    'Disabled': {
      type: 'BOOLEAN',
      defaultValue: false
    }
  }
};

module.exports = {
  inferAngularInputs,
  inferLabelInput,
  inferBooleanInputs,
  inferVariantInputs,
  inferSizeInput,
  findTextNodes,
  generateInputDeclarations,
  generateTemplateBindings,
  validateInferredInputs,
  createInferenceSummary,
  EXAMPLE_FIGMA_NODE
};