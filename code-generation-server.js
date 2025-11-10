// DEDICATED CODE GENERATION BACKEND SERVER
// Separate from the main design generation backend to avoid conflicts

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { generateAngularCode, testPipeline } = require('./code-generator-pipeline');
const { analyzeAndSave } = require('./smart-doc-automation/analyzer');
const { generateStorybookFromDocIR } = require('./smart-doc-automation/storybook-generator');
const { getComponentDetails } = require('./mcp-server');

const app = express();
const PORT = 3001; // Different port from main backend (3000)

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Code Generation Server running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Configuration
const OUTPUT_DIR = './design-system-web/src/generated-components';

/**
 * PRODUCTION VALIDATION: Validates generated code against production rules
 * @param {Object} generatedFiles - Generated files object
 * @param {string} screenName - Screen name
 * @returns {Object} Validation result
 */
function validateProductionCode(generatedFiles, screenName) {
  console.log('🔍 [Production Validator] Starting production code validation...');

  const errors = [];
  const warnings = [];

  // Rule 1: Validate TypeScript component
  if (generatedFiles.typescript) {
    const tsContent = generatedFiles.typescript.content;

    // Check for @Component decorator
    if (!tsContent.includes('@Component(')) {
      errors.push('Missing @Component decorator in TypeScript file');
    }

    // Check for @Input() properties
    if (!tsContent.includes('@Input()')) {
      warnings.push('No @Input() properties found - component may not be interactive');
    }

    // MCP REGISTRY CHECK: Ensure properties match law book
    try {
      const registryDetails = getComponentDetails(screenName.toLowerCase());
      if (!registryDetails.error) {
        console.log(`🛡️ [MCP Validator] Validating ${screenName} against Registry...`);
        const registryProps = Object.keys(registryDetails.props || {});

        // Check if generated code has required props
        registryProps.forEach(prop => {
          if (registryDetails.props[prop].required && !tsContent.includes(`${prop}:`)) {
            errors.push(`Required prop '${prop}' from Registry is missing in generated code.`);
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ [MCP Validator] Could not perform registry prop check:', e.message);
    }

    // Forbidden patterns check
    const forbiddenPatterns = ['${args.', '{{ args.', '$ {{ args.'];
    forbiddenPatterns.forEach(pattern => {
      if (tsContent.includes(pattern)) {
        errors.push(`Forbidden pattern found in TypeScript: ${pattern}`);
      }
    });
  }

  // Rule 2: Validate HTML template
  if (generatedFiles.html) {
    const htmlContent = generatedFiles.html.content;

    // Check for proper Angular bindings
    if (!htmlContent.includes('{{') && !htmlContent.includes('[')) {
      warnings.push('No Angular bindings found in template - may be static');
    }

    // Forbidden patterns check
    const forbiddenPatterns = ['${args.', 'args.'];
    forbiddenPatterns.forEach(pattern => {
      if (htmlContent.includes(pattern)) {
        errors.push(`Forbidden pattern found in HTML template: ${pattern}`);
      }
    });
  }

  console.log(`🔍 [Production Validator] Validation complete: ${errors.length} errors, ${warnings.length} warnings`);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Writes generated files to the local file system
 * @param {Object} generatedFiles - Files object from code generation
 * @param {string} screenName - Name of the screen/component
 * @returns {Object} Result with file paths and success status
 */
function writeFilesToDisk(generatedFiles, screenName) {
  console.log('💾 [File Writer] Writing files to disk...');

  const componentDir = path.join(OUTPUT_DIR, screenName.toLowerCase());

  // Create directories if they don't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📁 [File Writer] Created output directory:', OUTPUT_DIR);
  }

  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
    console.log('📁 [File Writer] Created component directory:', componentDir);
  }

  const writtenFiles = [];
  const errors = [];

  try {
    // Write TypeScript file
    if (generatedFiles.typescript) {
      const tsPath = path.join(componentDir, generatedFiles.typescript.fileName);
      fs.writeFileSync(tsPath, generatedFiles.typescript.content, 'utf8');
      writtenFiles.push({ type: 'typescript', path: tsPath, size: generatedFiles.typescript.size });
      console.log('[AG] Writing:', generatedFiles.typescript.fileName);
    }

    // Write HTML file
    if (generatedFiles.html) {
      const htmlPath = path.join(componentDir, generatedFiles.html.fileName);
      fs.writeFileSync(htmlPath, generatedFiles.html.content, 'utf8');
      writtenFiles.push({ type: 'html', path: htmlPath, size: generatedFiles.html.size });
      console.log('[AG] Writing:', generatedFiles.html.fileName);
    }

    // Write SCSS file
    if (generatedFiles.scss) {
      const scssPath = path.join(componentDir, generatedFiles.scss.fileName);
      fs.writeFileSync(scssPath, generatedFiles.scss.content, 'utf8');
      writtenFiles.push({ type: 'scss', path: scssPath, size: generatedFiles.scss.size });
      console.log('[AG] Writing:', generatedFiles.scss.fileName);
    }

    console.log(`💾 [File Writer] Successfully wrote ${writtenFiles.length} files to: ${componentDir}`);

    return {
      success: true,
      componentDir,
      writtenFiles,
      errors: []
    };

  } catch (error) {
    console.error('❌ [File Writer] Error writing files:', error.message);
    errors.push(`File write error: ${error.message}`);

    return {
      success: false,
      componentDir,
      writtenFiles,
      errors
    };
  }
}

/**
 * Runs the complete Smart Documentation pipeline
 * @param {string} componentPath - Path to the component TypeScript file
 * @param {string} screenName - Name of the screen/component
 * @returns {Object} Result with documentation generation status
 */
async function runSmartDocumentationPipeline(componentPath, screenName) {
  console.log('📚 [Smart Docs] Starting Smart Documentation pipeline...');

  const results = {
    analyzer: { success: false, error: null },
    storybook: { success: false, error: null }
  };

  try {
    // Step 1: Run Component Analyzer
    console.log('📊 [Smart Docs] Step 1: Running component analyzer...');
    const docIR = analyzeAndSave(componentPath);
    results.analyzer.success = true;
    results.analyzer.componentName = docIR.componentName;
    results.analyzer.inputsCount = docIR.inputs.length;
    results.analyzer.outputsCount = docIR.outputs.length;
    console.log('✅ [Smart Docs] Analyzer completed successfully');
    console.log(`📋 [Smart Docs] Component: ${docIR.componentName}`);
    console.log(`📝 [Smart Docs] Inputs: ${docIR.inputs.length}, Outputs: ${docIR.outputs.length}`);

    // Step 2: Run Storybook Generator
    console.log('📖 [Smart Docs] Step 2: Running Storybook generator...');
    const docIRPath = path.join(__dirname, 'smart-doc-automation', 'doc-ir.json');
    const storybookResult = generateStorybookFromDocIR(docIRPath);
    results.storybook.success = true;
    results.storybook.fileName = storybookResult.fileName;
    results.storybook.storyTitle = storybookResult.storyTitle;
    results.storybook.argsCount = storybookResult.inputsCount;
    console.log('✅ [Smart Docs] Storybook generator completed successfully');
    console.log(`📖 [Smart Docs] Story file: ${storybookResult.fileName}`);
    console.log(`🎯 [Smart Docs] Story title: ${storybookResult.storyTitle}`);
    console.log(`📝 [Smart Docs] Args: ${storybookResult.inputsCount} properties`);

    return {
      success: true,
      results
    };

  } catch (error) {
    console.error('❌ [Smart Docs] Smart Documentation pipeline failed:', error.message);

    // Determine which step failed
    if (!results.analyzer.success) {
      results.analyzer.error = error.message;
    } else {
      results.storybook.error = error.message;
    }

    return {
      success: false,
      error: error.message,
      results
    };
  }
}

// Store last generated files for retrieval
let lastGeneratedFiles = null;

// Main code generation endpoint
app.post('/generate-code', async (req, res) => {
  try {
    const { figmaLayoutJSON, screenName, testMode, figmaNode } = req.body;

    console.log('🔧 [CodeGen Server] Code generation request received');
    console.log('📋 [CodeGen Server] Screen name:', screenName || 'GeneratedScreen');
    console.log('📊 [CodeGen Server] Components:', figmaLayoutJSON?.components?.length || 0);
    console.log('🧪 [CodeGen Server] Test mode:', testMode || false);
    console.log('🔍 [CodeGen Server] Figma Node provided:', !!figmaNode);
    console.log('🚀 [CodeGen Server] Starting END-TO-END PIPELINE...');

    if (!figmaLayoutJSON) {
      return res.status(400).json({
        error: 'figmaLayoutJSON is required',
        example: {
          figmaLayoutJSON: { screenType: "mobile", components: [] },
          screenName: "Login",
          testMode: false
        }
      });
    }

    const finalScreenName = screenName || 'GeneratedScreen';
    let result;

    // STEP 1: Generate Angular Code
    console.log('⚡ [Pipeline] STEP 1: Generating Angular code...');
    if (testMode) {
      console.log('🧪 [CodeGen Server] Using test pipeline (mock response)');
      result = await testPipeline(figmaLayoutJSON, finalScreenName, figmaNode);
    } else {
      console.log('🌟 [CodeGen Server] Using full pipeline with Gemini API');
      result = await generateAngularCode(figmaLayoutJSON, finalScreenName, figmaNode);
    }

    if (!result.success) {
      console.log('❌ [Pipeline] STEP 1 FAILED: Code generation failed');
      console.log('❌ [CodeGen Server] Errors:', result.errors);

      return res.status(400).json({
        success: false,
        step: 'code-generation',
        errors: result.errors,
        designIR: result.designIR,
        summary: result.summary,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ [Pipeline] STEP 1 COMPLETED: Code generation successful');
    console.log('📁 [CodeGen Server] Files generated:', result.summary?.filesExtracted || 0);

    // STEP 1.5: PRODUCTION VALIDATION (MANDATORY)
    console.log('⚡ [Pipeline] STEP 1.5: Production code validation...');
    const validationResult = validateProductionCode(result.generatedFiles, finalScreenName);

    if (!validationResult.valid) {
      console.log('❌ [Pipeline] STEP 1.5 FAILED: Production validation failed');
      console.log('❌ [Production Validator] Errors:', validationResult.errors);

      return res.status(400).json({
        success: false,
        step: 'production-validation',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        message: 'Generated code failed production validation',
        timestamp: new Date().toISOString()
      });
    }

    if (validationResult.warnings.length > 0) {
      console.log('⚠️ [Production Validator] Warnings:', validationResult.warnings);
    }

    console.log('✅ [Pipeline] STEP 1.5 COMPLETED: Production validation passed');

    // STEP 2: Write Files to Disk
    console.log('⚡ [Pipeline] STEP 2: Writing files to disk...');
    const fileWriteResult = writeFilesToDisk(result.generatedFiles, finalScreenName);

    if (!fileWriteResult.success) {
      console.log('❌ [Pipeline] STEP 2 FAILED: File writing failed');

      return res.status(500).json({
        success: false,
        step: 'file-writing',
        errors: fileWriteResult.errors,
        writtenFiles: fileWriteResult.writtenFiles,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ [Pipeline] STEP 2 COMPLETED: Files written to disk');
    console.log('📁 [Pipeline] Component directory:', fileWriteResult.componentDir);

    // STEP 3: Run Smart Documentation Pipeline
    console.log('⚡ [Pipeline] STEP 3: Running Smart Documentation...');

    // Fix: Use the actual written file path instead of guessing from screenName
    // This handles cases where screenName was sanitized (e.g. mobile-form -> mobileform)
    const tsFile = fileWriteResult.writtenFiles.find(f => f.type === 'typescript');

    if (!tsFile) {
      throw new Error('TypeScript file was not generated, cannot run Smart Docs');
    }

    const componentPath = tsFile.path;
    console.log(`📝 [Pipeline] Using TS file for Smart Docs: ${componentPath}`);

    const smartDocsResult = await runSmartDocumentationPipeline(componentPath, finalScreenName);

    if (!smartDocsResult.success) {
      console.log('❌ [Pipeline] STEP 3 FAILED: Smart Documentation failed');

      return res.status(500).json({
        success: false,
        step: 'smart-documentation',
        error: smartDocsResult.error,
        smartDocsResults: smartDocsResult.results,
        writtenFiles: fileWriteResult.writtenFiles,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ [Pipeline] STEP 3 COMPLETED: Smart Documentation successful');
    console.log('🎉 [Pipeline] END-TO-END PIPELINE COMPLETED SUCCESSFULLY!');

    // Store files for retrieval (legacy support)
    lastGeneratedFiles = {
      files: result.generatedFiles,
      exportFiles: result.exportFiles,
      screenName: finalScreenName,
      timestamp: new Date().toISOString()
    };

    // Return comprehensive success response
    res.json({
      success: true,
      pipeline: {
        step1_codeGeneration: { success: true, filesGenerated: result.summary?.filesExtracted || 0 },
        step2_fileWriting: { success: true, filesWritten: fileWriteResult.writtenFiles.length, componentDir: fileWriteResult.componentDir },
        step3_smartDocs: { success: true, results: smartDocsResult.results }
      },
      designIR: result.designIR,
      files: result.generatedFiles,
      exportFiles: result.exportFiles,
      writtenFiles: fileWriteResult.writtenFiles,
      smartDocumentation: smartDocsResult.results,
      summary: result.summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Pipeline] CRITICAL ERROR in end-to-end pipeline:', error.message);
    res.status(500).json({
      error: 'End-to-end pipeline error',
      message: error.message,
      step: 'pipeline-orchestration',
      timestamp: new Date().toISOString()
    });
  }
});

// Get last generated files
app.get('/last-files', (req, res) => {
  try {
    if (!lastGeneratedFiles) {
      return res.status(404).json({
        error: 'No files generated yet',
        message: 'Generate some code first using POST /generate-code'
      });
    }

    console.log('📁 [CodeGen Server] Serving last generated files');
    res.json(lastGeneratedFiles);

  } catch (error) {
    console.error('❌ [CodeGen Server] Error serving files:', error.message);
    res.status(500).json({
      error: 'Error retrieving files',
      message: error.message
    });
  }
});

// Get individual file content
app.get('/file/:type', (req, res) => {
  try {
    const { type } = req.params; // typescript, html, scss

    if (!lastGeneratedFiles) {
      return res.status(404).json({
        error: 'No files generated yet'
      });
    }

    const file = lastGeneratedFiles.files[type];
    if (!file) {
      return res.status(404).json({
        error: `File type '${type}' not found`,
        availableTypes: Object.keys(lastGeneratedFiles.files)
      });
    }

    console.log(`📄 [CodeGen Server] Serving ${file.fileName}`);

    // Set appropriate content type
    const contentTypes = {
      typescript: 'text/typescript',
      html: 'text/html',
      scss: 'text/scss'
    };

    res.setHeader('Content-Type', contentTypes[type] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.content);

  } catch (error) {
    console.error('❌ [CodeGen Server] Error serving file:', error.message);
    res.status(500).json({
      error: 'Error retrieving file',
      message: error.message
    });
  }
});

// Test endpoint for quick verification
app.post('/test', async (req, res) => {
  try {
    console.log('🧪 [CodeGen Server] Test endpoint called');

    const testLayout = {
      screenType: "mobile",
      components: [
        { componentKey: "heading", text: "Test" },
        { componentKey: "primary_button", text: "Click Me" }
      ]
    };

    const result = await testPipeline(testLayout, "TestScreen");

    res.json({
      success: true,
      message: 'Code generation server is working',
      testResult: result.success,
      filesGenerated: result.summary?.filesExtracted || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CodeGen Server] Test error:', error.message);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ [CodeGen Server] Unhandled error:', error.message);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 [CodeGen Server] Code Generation Server running');
  console.log(`📍 [CodeGen Server] URL: http://localhost:${PORT}`);
  console.log(`📋 [CodeGen Server] Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 [CodeGen Server] Code endpoint: POST http://localhost:${PORT}/generate-code`);
  console.log(`🧪 [CodeGen Server] Test endpoint: POST http://localhost:${PORT}/test`);
  console.log('─'.repeat(60));
  console.log('📝 [CodeGen Server] Example request:');
  console.log(JSON.stringify({
    figmaLayoutJSON: { screenType: "mobile", components: [] },
    screenName: "Login",
    testMode: false
  }, null, 2));
  console.log('─'.repeat(60));
});

// PRODUCTION SAFETY: Library generation functions removed
// Reason: Template-based stories violate production rules  
// Use main code generation pipeline for real Angular components only

module.exports = app;

