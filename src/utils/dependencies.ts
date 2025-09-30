/**
 * Dependency guidance for Monica MCP tools
 * Helps LLMs understand tool prerequisites and sequencing
 */

export const TOOL_DEPENDENCIES = {
  // Tools that need a contact ID
  contactId: {
    description: "Requires a contact ID from an existing contact",
    prerequisiteTool: "monica_manage_contact",
    prerequisiteAction: "create",
    alternativeTools: ["monica_search_contacts"],
    example: "First create a contact or search for existing contacts to get a contactId"
  },

  // Tools that need a contact field type ID
  contactFieldTypeId: {
    description: "Requires a contact field type ID",
    prerequisiteTool: "monica_browse_metadata",
    prerequisiteAction: "resource='contactFieldTypes'",
    example: "Use monica_browse_metadata with resource='contactFieldTypes', or supply contactFieldTypeName directly."
  },

  // Tools that need an activity type category ID
  activityTypeCategoryId: {
    description: "Requires an activity type category ID",
    prerequisiteTool: "monica_manage_activity_type_category",
    prerequisiteAction: "create or list",
    example: "Use monica_manage_activity_type_category with action 'list' to see available categories, or 'create' to make a new one"
  },

  // Tools that need an activity type ID
  activityTypeId: {
    description: "Requires an activity type ID",
    prerequisiteTool: "monica_browse_metadata",
    prerequisiteAction: "resource='activityTypes'",
    example: "Use monica_browse_metadata with resource='activityTypes', or provide activityTypeName so the tool resolves it automatically."
  }
} as const;

export function getDependencyGuidance(missingField: string): string {
  const guidance = TOOL_DEPENDENCIES[missingField as keyof typeof TOOL_DEPENDENCIES];

  if (!guidance) {
    return `Missing required field: ${missingField}`;
  }

  return `Missing ${missingField}: ${guidance.description}. ${guidance.example}`;
}
