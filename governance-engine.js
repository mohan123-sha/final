/**
 * Professional Design Governance Engine (Multi-Component Edition)
 * Performs weighted scoring and architectural validation for any number of components.
 */
class GovernanceEngine {
    constructor(registry) {
        this.registry = registry;
        this.weights = {
            CRITICAL: 50, // Blocks handoff
            MAJOR: 20,    // Significant warning
            MINOR: 5      // Visual polish or property warning
        };
    }

    validate(node) {
        this.globalScore = 100;
        this.violations = [];
        this.scannedComponents = [];
        this.hasCriticalViolation = false;
        this.breakdown = {
            CRITICAL: 0,
            MAJOR: 0,
            MINOR: 0,
            PASS: 0
        };

        this._recursiveCheck(node);

        // Global rules
        this.globalScore = Math.max(0, this.globalScore);

        // Count verified components as PASS
        this.breakdown.PASS = this.scannedComponents.filter(c => c.status === 'VERIFIED').length;

        return {
            score: this.globalScore,
            violations: this.violations,
            components: this.scannedComponents,
            breakdown: this.breakdown,
            valid: !this.hasCriticalViolation && this.globalScore >= 90
        };
    }

    _recursiveCheck(node, parentNode = null) {
        const baseNodeName = node.name.split('/')[0].trim().toLowerCase();
        let cleanName = baseNodeName.replace(/\s+/g, '-');
        const lookupName = cleanName.startsWith('app-') ? cleanName.replace('app-', '') : cleanName;
        const isComponent = baseNodeName.startsWith('app-') || this.registry.components[lookupName];

        if (isComponent) {
            const componentRules = this.registry.components[lookupName];
            let status = 'VERIFIED';
            let componentViolations = [];
            let fragment = null;

            if (!componentRules) {
                status = 'UNKNOWN';
                this._addViolation(node.name, `Component "${lookupName}" not in Registry.`, 'CRITICAL', 'Existence Check', 'Register to officialize.');
                fragment = this._generateFragment(node, lookupName);
            } else {
                // 2. Nesting Check (Composition)
                if (parentNode) {
                    const parentNodeName = parentNode.name.toLowerCase().replace(/\s+/g, '-');
                    const parentLookup = parentNodeName.startsWith('app-') ? parentNodeName.replace('app-', '') : parentNodeName;
                    const parentRules = this.registry.components[parentLookup];

                    if (parentRules && parentRules.composition) {
                        const { cannotContain } = parentRules.composition;
                        if (cannotContain && (cannotContain.includes(lookupName) || cannotContain.includes('*'))) {
                            status = 'VIOLATION';
                            this._addViolation(node.name, `Illegal nesting: "${lookupName}" inside "${parentLookup}".`, 'CRITICAL', 'Composition', `Move out of "${parentNode.name}".`);
                        }
                    }
                }

                // 3. Property Check
                if (node.componentProperties && componentRules.props) {
                    const officialProps = Object.keys(componentRules.props).map(p => p.toLowerCase());
                    Object.keys(node.componentProperties).forEach(propKey => {
                        const cleanProp = propKey.split('#')[0].toLowerCase();
                        if (!officialProps.includes(cleanProp)) {
                            this._addViolation(node.name, `Unknown property "${cleanProp}".`, 'MINOR', 'Property Validation', 'Use official props.');
                        }
                    });
                }
            }

            this.scannedComponents.push({
                id: node.id,
                name: node.name,
                lookupName: lookupName,
                status: status,
                fragment: fragment
            });
        }

        // Recurse to children
        if (node.children) {
            node.children.forEach(child => this._recursiveCheck(child, node));
        }
    }

    _generateFragment(node, name) {
        const props = {};
        if (node.componentProperties) {
            Object.keys(node.componentProperties).forEach(key => {
                const cleanKey = key.split('#')[0].toLowerCase();
                props[cleanKey] = { type: 'string', required: false };
            });
        }

        // Deep Visual extraction for the fragment
        const visuals = {
            backgroundColor: node.backgroundColor || 'transparent',
            borderRadius: node.borderRadius || 0,
            padding: node.padding || 0,
            layout: node.layoutMode || 'none'
        };

        return {
            [name]: {
                category: "new-discovery",
                description: "Auto-detected component from Figma scan.",
                props: props,
                composition: {
                    canContain: (node.children && node.children.length > 0) ? ["*"] : [],
                    cannotContain: []
                },
                visuals: visuals,
                constraints: ["mustBeOfficialized"]
            }
        };
    }

    _addViolation(nodeName, message, severity, rule, suggestion) {
        this.violations.push({ nodeName, message, severity, rule, suggestion });
        this.globalScore -= this.weights[severity] || 0;
        this.breakdown[severity]++;
        if (severity === 'CRITICAL') this.hasCriticalViolation = true;
    }
}

module.exports = GovernanceEngine;
