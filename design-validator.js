const fs = require('fs');
const path = require('path');

// Load Design System Bricks (Registry)
const registryPath = path.join(__dirname, 'component-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Load Mock Figma Design
const figmaDesignPath = path.join(__dirname, 'mock-figma-design.json');
const figmaDesign = JSON.parse(fs.readFileSync(figmaDesignPath, 'utf8'));

console.log('🚀 [Figma Design Validator] Starting validation...\n');

function validateNode(node, parentNode = null) {
    const results = [];
    const componentName = node.name;
    const lookupName = componentName.replace('app-', '');
    const componentRules = registry.components[lookupName];

    if (!componentRules) {
        results.push({
            id: node.id,
            status: 'ERROR',
            message: `Component "${componentName}" does not exist in the Design System registry.`
        });
        return results;
    }

    // Check Nesting Rules
    if (parentNode) {
        const parentLookupName = parentNode.name.replace('app-', '');
        const parentRules = registry.components[parentLookupName];

        if (parentRules && parentRules.composition) {
            const { canContain, cannotContain } = parentRules.composition;

            // Check if specifically forbidden (or all forbidden via wildcard)
            if (cannotContain && (cannotContain.includes(lookupName) || cannotContain.includes('*'))) {
                results.push({
                    id: node.id,
                    status: 'ERROR',
                    message: `ILLEGAL NESTING: "${parentNode.name}" is forbidden from containing "${componentName}".`
                });
            }

            // Check if specifically allowed (if canContain exists and not wildcard)
            if (canContain && canContain.length > 0 && !canContain.includes('*') && !canContain.includes(lookupName)) {
                results.push({
                    id: node.id,
                    status: 'WARNING',
                    message: `STRICT NESTING: "${parentNode.name}" usually only contains [${canContain.join(', ')}]. "${componentName}" found.`
                });
            }
        }
    }

    // Validate Props
    if (node.props && componentRules.props) {
        Object.keys(node.props).forEach(prop => {
            const regProp = componentRules.props[prop]; // Props are also an object in my registry
            if (!regProp) {
                results.push({
                    id: node.id,
                    status: 'WARNING',
                    message: `Unknown property "${prop}" for component "${componentName}".`
                });
            }
        });
    }

    // Success if no errors/warnings added for this node specifically
    if (results.length === 0) {
        results.push({
            id: node.id,
            status: 'SUCCESS',
            message: `"${componentName}" (ID: ${node.id}) is valid.`
        });
    }

    // Recurse children
    if (node.children) {
        node.children.forEach(child => {
            results.push(...validateNode(child, node));
        });
    }

    return results;
}

// Run Validation on all frames
const finalReport = {
    timestamp: new Date().toISOString(),
    frames: []
};

figmaDesign.frames.forEach(frame => {
    console.log(`Checking Frame: ${frame.name}`);
    const frameResults = [];
    frame.nodes.forEach(node => {
        frameResults.push(...validateNode(node));
    });

    const hasErrors = frameResults.some(r => r.status === 'ERROR');
    console.log(hasErrors ? `❌ ${frame.name} FAILED` : `✅ ${frame.name} PASSED`);

    finalReport.frames.push({
        name: frame.name,
        pass: !hasErrors,
        results: frameResults
    });
});

// Write Report
const reportPath = path.join(__dirname, 'design-validation-report.json');
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

console.log(`\n📄 Validation report generated at: ${reportPath}`);

// Summary Output for Console
console.log('\n--- SUMMARY ---');
finalReport.frames.forEach(f => {
    console.log(`[${f.pass ? 'PASS' : 'FAIL'}] ${f.name}`);
    f.results.filter(r => r.status === 'ERROR').forEach(e => {
        console.log(`   !! ${e.message}`);
    });
});
