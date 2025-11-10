// PHASE 4: ENHANCED LAYOUT JSON SCHEMA
// Refinement for cleaner Design IR and safer codegen

const LAYOUT_JSON_SCHEMA = {
  // Root level properties
  screenType: {
    type: "string",
    enum: ["web", "mobile"],
    required: true,
    description: "Target platform for the layout"
  },
  
  application_type: {
    type: "string", 
    enum: ["dashboard", "ecommerce", "healthcare", "education", "saas", "landing_page", "auth", "profile", "settings"],
    required: true,
    description: "Application domain classification"
  },
  
  layout_archetype: {
    type: "string",
    enum: ["dashboard_web", "landing_web", "ecommerce_web", "healthcare_web", "auth_flow", "content_page", "mobile_stacked", "mobile_dashboard", "mobile_form"],
    required: true,
    description: "Selected layout pattern"
  },
  
  canvas_size: {
    type: "object",
    required: true,
    properties: {
      width: { type: "number", minimum: 200, maximum: 2000 },
      height: { type: "number", minimum: 200, maximum: 2000 }
    },
    description: "Frame dimensions in pixels"
  },
  
  // PHASE 4: Enhanced sections structure
  sections: {
    type: "array",
    required: true,
    minItems: 1,
    items: {
      type: "object",
      required: ["section_name", "layout_direction", "components"],
      properties: {
        section_name: {
          type: "string",
          enum: [
            "header", "hero", "main_content", "sidebar", "content_sections", 
            "cta", "centered_form", "stacked_content", "product_grid", 
            "sidebar_filters", "patient_info", "actions", "cards_stack", 
            "bottom_actions", "form_stack"
          ],
          description: "Semantic section identifier"
        },
        
        layout_direction: {
          type: "string",
          enum: ["vertical", "horizontal", "grid"],
          description: "How components are arranged within this section"
        },
        
        // PHASE 4: Enhanced component structure
        components: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["componentKey"],
            properties: {
              componentKey: {
                type: "string",
                enum: [
                  "primary_button", "secondary_button", "primary_icon_button",
                  "default_blankslate", "wrapped_description", "text_input",
                  "card_container", "heading", "description"
                ],
                description: "Design system component identifier"
              },
              
              text: {
                type: "string",
                description: "Optional text content for text-based components"
              },
              
              // PHASE 4: Component metadata (no styles, just structure)
              component_role: {
                type: "string",
                enum: ["primary_action", "secondary_action", "navigation", "content", "input", "container", "decoration"],
                description: "Semantic role of the component in the layout"
              },
              
              layout_priority: {
                type: "number",
                minimum: 1,
                maximum: 10,
                description: "Visual importance ranking (1=lowest, 10=highest)"
              }
            }
          }
        },
        
        // PHASE 4: Section metadata
        section_priority: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Section importance in the overall layout"
        },
        
        responsive_behavior: {
          type: "string",
          enum: ["maintain", "collapse", "stack", "hide_on_mobile"],
          description: "How this section behaves on smaller screens"
        }
      }
    }
  },
  
  // PHASE 4: Layout metadata (no styles, just structure)
  layout_metadata: {
    type: "object",
    properties: {
      complexity_score: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Layout complexity rating"
      },
      
      primary_user_flow: {
        type: "string",
        enum: ["read", "input", "navigate", "purchase", "authenticate", "configure"],
        description: "Main user interaction pattern"
      },
      
      content_density: {
        type: "string",
        enum: ["sparse", "medium", "dense"],
        description: "Information density level"
      }
    }
  }
};

// PHASE 4: Validation functions
function validateLayoutJSON(layoutJSON) {
  const errors = [];
  const warnings = [];
  
  // Required fields validation
  if (!layoutJSON.screenType) {
    errors.push("Missing required field: screenType");
  }
  
  if (!layoutJSON.application_type) {
    errors.push("Missing required field: application_type");
  }
  
  if (!layoutJSON.layout_archetype) {
    errors.push("Missing required field: layout_archetype");
  }
  
  if (!layoutJSON.canvas_size || !layoutJSON.canvas_size.width || !layoutJSON.canvas_size.height) {
    errors.push("Missing or invalid canvas_size");
  }
  
  if (!Array.isArray(layoutJSON.sections) || layoutJSON.sections.length === 0) {
    errors.push("Missing or empty sections array");
  }
  
  // Sections validation
  if (layoutJSON.sections) {
    layoutJSON.sections.forEach((section, index) => {
      if (!section.section_name) {
        errors.push(`Section ${index}: Missing section_name`);
      }
      
      if (!section.layout_direction) {
        errors.push(`Section ${index}: Missing layout_direction`);
      }
      
      if (!Array.isArray(section.components) || section.components.length === 0) {
        errors.push(`Section ${index}: Missing or empty components array`);
      }
      
      // Component validation
      if (section.components) {
        section.components.forEach((component, compIndex) => {
          if (!component.componentKey) {
            errors.push(`Section ${index}, Component ${compIndex}: Missing componentKey`);
          }
          
          // Validate allowed component keys
          const allowedKeys = LAYOUT_JSON_SCHEMA.sections.items.properties.components.items.properties.componentKey.enum;
          if (component.componentKey && !allowedKeys.includes(component.componentKey)) {
            errors.push(`Section ${index}, Component ${compIndex}: Invalid componentKey '${component.componentKey}'`);
          }
        });
      }
    });
  }
  
  // Canvas size validation
  if (layoutJSON.canvas_size) {
    if (layoutJSON.canvas_size.width < 200 || layoutJSON.canvas_size.width > 2000) {
      warnings.push("Canvas width outside recommended range (200-2000px)");
    }
    
    if (layoutJSON.canvas_size.height < 200 || layoutJSON.canvas_size.height > 2000) {
      warnings.push("Canvas height outside recommended range (200-2000px)");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// PHASE 4: Schema enhancement utilities
function enhanceLayoutJSON(basicLayoutJSON) {
  // Add missing metadata with intelligent defaults
  const enhanced = { ...basicLayoutJSON };
  
  // Add component roles and priorities
  if (enhanced.sections) {
    enhanced.sections = enhanced.sections.map((section, sectionIndex) => {
      const enhancedSection = { ...section };
      
      // Add section priority based on name
      if (!enhancedSection.section_priority) {
        enhancedSection.section_priority = getSectionPriority(section.section_name);
      }
      
      // Add responsive behavior based on section type
      if (!enhancedSection.responsive_behavior) {
        enhancedSection.responsive_behavior = getResponsiveBehavior(section.section_name, enhanced.screenType);
      }
      
      // Enhance components
      if (enhancedSection.components) {
        enhancedSection.components = enhancedSection.components.map((component, compIndex) => {
          const enhancedComponent = { ...component };
          
          // Add component role
          if (!enhancedComponent.component_role) {
            enhancedComponent.component_role = getComponentRole(component.componentKey);
          }
          
          // Add layout priority
          if (!enhancedComponent.layout_priority) {
            enhancedComponent.layout_priority = getComponentPriority(component.componentKey, compIndex);
          }
          
          return enhancedComponent;
        });
      }
      
      return enhancedSection;
    });
  }
  
  // Add layout metadata
  if (!enhanced.layout_metadata) {
    enhanced.layout_metadata = {
      complexity_score: calculateComplexityScore(enhanced),
      primary_user_flow: inferUserFlow(enhanced.application_type),
      content_density: inferContentDensity(enhanced.sections)
    };
  }
  
  return enhanced;
}

// Helper functions for intelligent defaults
function getSectionPriority(sectionName) {
  const priorities = {
    header: 9,
    hero: 10,
    main_content: 8,
    sidebar: 6,
    content_sections: 7,
    cta: 9,
    centered_form: 10,
    stacked_content: 7,
    product_grid: 8,
    sidebar_filters: 5,
    patient_info: 8,
    actions: 7,
    cards_stack: 7,
    bottom_actions: 6,
    form_stack: 8
  };
  
  return priorities[sectionName] || 5;
}

function getResponsiveBehavior(sectionName, screenType) {
  if (screenType === 'mobile') return 'maintain';
  
  const behaviors = {
    header: 'maintain',
    hero: 'maintain', 
    main_content: 'maintain',
    sidebar: 'collapse',
    sidebar_filters: 'collapse',
    content_sections: 'stack',
    cta: 'maintain',
    centered_form: 'maintain',
    actions: 'stack',
    bottom_actions: 'maintain'
  };
  
  return behaviors[sectionName] || 'maintain';
}

function getComponentRole(componentKey) {
  const roles = {
    primary_button: 'primary_action',
    secondary_button: 'secondary_action',
    primary_icon_button: 'primary_action',
    text_input: 'input',
    card_container: 'container',
    heading: 'content',
    description: 'content',
    wrapped_description: 'content',
    default_blankslate: 'decoration'
  };
  
  return roles[componentKey] || 'content';
}

function getComponentPriority(componentKey, index) {
  const basePriorities = {
    primary_button: 9,
    secondary_button: 6,
    primary_icon_button: 8,
    text_input: 7,
    card_container: 5,
    heading: 8,
    description: 6,
    wrapped_description: 5,
    default_blankslate: 3
  };
  
  // Adjust based on position (first components get higher priority)
  const positionBonus = Math.max(0, 3 - index);
  return Math.min(10, (basePriorities[componentKey] || 5) + positionBonus);
}

function calculateComplexityScore(layoutJSON) {
  let score = 1;
  
  // Add points for sections
  score += (layoutJSON.sections?.length || 0) * 1;
  
  // Add points for total components
  const totalComponents = layoutJSON.sections?.reduce((sum, section) => 
    sum + (section.components?.length || 0), 0) || 0;
  score += Math.min(5, totalComponents * 0.5);
  
  // Add points for multi-column layouts
  if (layoutJSON.layout_archetype?.includes('dashboard') || 
      layoutJSON.layout_archetype?.includes('ecommerce')) {
    score += 2;
  }
  
  return Math.min(10, Math.round(score));
}

function inferUserFlow(applicationType) {
  const flows = {
    dashboard: 'navigate',
    ecommerce: 'purchase',
    healthcare: 'input',
    education: 'read',
    saas: 'configure',
    landing_page: 'read',
    auth: 'authenticate',
    profile: 'configure',
    settings: 'configure'
  };
  
  return flows[applicationType] || 'read';
}

function inferContentDensity(sections) {
  const totalComponents = sections?.reduce((sum, section) => 
    sum + (section.components?.length || 0), 0) || 0;
  
  if (totalComponents <= 3) return 'sparse';
  if (totalComponents <= 8) return 'medium';
  return 'dense';
}

module.exports = {
  LAYOUT_JSON_SCHEMA,
  validateLayoutJSON,
  enhanceLayoutJSON
};