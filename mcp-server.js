/**
 * Agentic Design System - MCP Server
 * 
 * Provides tools for AI agents to query the design system rules,
 * validate component compositions, and get component schemas.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'component-registry.json');

function loadRegistry() {
    try {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading registry:', error);
        return { components: {}, sections: {} };
    }
}

/**
 * Tool: list_components
 * Lists all available components in the design system.
 */
function listComponents() {
    const registry = loadRegistry();
    return Object.keys(registry.components).map(key => ({
        key,
        type: registry.components[key].type,
        tag: registry.components[key].tag
    }));
}

/**
 * Tool: get_component_details
 * Returns detailed schema and rules for a specific component.
 */
function getComponentDetails(componentKey) {
    const registry = loadRegistry();
    const component = registry.components[componentKey];
    if (!component) {
        return { error: `Component '${componentKey}' not found.` };
    }
    return component;
}

/**
 * Tool: validate_composition
 * Validates if a child component can be placed inside a parent.
 */
function validateComposition(parentKey, childKey) {
    const registry = loadRegistry();

    const parentComponent = registry.components[parentKey];
    const childComponent = registry.components[childKey];

    if (!parentComponent) {
        return { valid: false, reason: `Parent component '${parentKey}' not found.` };
    }
    if (!childComponent) {
        return { valid: false, reason: `Child component '${childKey}' not found.` };
    }

    const composition = parentComponent.composition;
    if (!composition) {
        return { valid: true, reason: 'No composition rules defined for parent.' };
    }

    const canContain = composition.canContain || [];
    const cannotContain = composition.cannotContain || [];

    const isAllowed = canContain.includes('*') || canContain.includes(childKey);
    const isForbidden = cannotContain.includes('*') || cannotContain.includes(childKey);

    if (isForbidden) {
        return { valid: false, reason: `Composition Error: Component '${childKey}' is explicitly forbidden inside '${parentKey}'.` };
    }

    if (isAllowed) {
        return { valid: true, reason: 'Success' };
    }

    return {
        valid: false,
        reason: `Composition Error: Component '${childKey}' is not allowed inside '${parentKey}'. Allowed: ${canContain.join(', ')}`
    };
}

/**
 * Simple MCP-like interface for the existing pipeline to use
 */
module.exports = {
    listComponents,
    getComponentDetails,
    validateComposition
};

// Example usage if run directly
if (require.main === module) {
    console.log("--- Listing Components ---");
    console.log(listComponents());

    console.log("\n--- Validating Composition (Primary Button in Hero) ---");
    console.log(validateComposition('hero', 'primary_button'));

    console.log("\n--- Validating Composition (Table in Heading - should fail) ---");
    console.log(validateComposition('heading', 'table'));
}
