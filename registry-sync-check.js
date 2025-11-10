/**
 * Registry Sync Check (CI Utility)
 * 
 * Purpose: Ensures that generated Angular components stay in sync 
 * with the component-registry.json. Detects "Registry Drift."
 */

const fs = require('fs');
const path = require('path');
const { getComponentDetails } = require('./mcp-server');
const { analyzeAngularComponent } = require('./smart-doc-automation/analyzer');

const GENERATED_DIR = path.join(__dirname, 'design-system-web', 'src', 'generated-components');

async function checkDrift() {
    console.log('🛡️ Starting Registry Sync Audit...\n');
    let driftCount = 0;

    if (!fs.existsSync(GENERATED_DIR)) {
        console.log('No generated components found. Skipping audit.');
        return;
    }

    const components = fs.readdirSub(GENERATED_DIR).filter(f => fs.statSync(path.join(GENERATED_DIR, f)).isDirectory());

    for (const compDir of components) {
        const tsFile = path.join(GENERATED_DIR, compDir, `${compDir}.component.ts`);
        if (!fs.existsSync(tsFile)) continue;

        console.log(`Checking [${compDir}]...`);

        try {
            // 1. Get Law (Registry)
            const registryDetails = getComponentDetails(compDir);
            if (registryDetails.error) {
                console.warn(`  ⚠️ Warning: Component '${compDir}' exists in code but NOT in Registry law book.`);
                driftCount++;
                continue;
            }

            // 2. Get Reality (Actual Code)
            const docIR = analyzeAngularComponent(tsFile);

            // 3. Compare Required Inputs
            const registryProps = registryDetails.props || {};
            const codeInputs = docIR.inputs.map(i => i.name);

            Object.keys(registryProps).forEach(propKey => {
                if (registryProps[propKey].required && !codeInputs.includes(propKey)) {
                    console.error(`  ❌ DRIFT DETECTED: Required prop '${propKey}' is missing in ${compDir}.component.ts`);
                    driftCount++;
                }
            });

            // 4. Detect Undocumented Inputs (AI Hallucinations)
            codeInputs.forEach(inputName => {
                if (!registryProps[inputName]) {
                    console.warn(`  ⚠️ Unsanctioned Prop: '${inputName}' found in code but not in Registry.`);
                    driftCount++;
                }
            });

        } catch (error) {
            console.error(`  ❌ Error auditing ${compDir}:`, error.message);
            driftCount++;
        }
    }

    console.log('\n--- Audit Results ---');
    if (driftCount === 0) {
        console.log('✅ 0 issues found. Registry and components are in perfect sync.');
        process.exit(0);
    } else {
        console.error(`❌ Found ${driftCount} synchronization issues.`);
        process.exit(1);
    }
}

// Helper to list directories
fs.readdirSub = (dir) => fs.readdirSync(dir);

checkDrift();
