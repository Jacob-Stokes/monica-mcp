import { z } from 'zod';
import type {
  CreateRelationshipPayload,
  UpdateRelationshipPayload
} from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeRelationship } from '../../utils/formatters.js';
import { resolveRelationshipTypeId } from '../../utils/resolvers.js';

const relationshipPayloadSchema = z.object({
  contactIsId: z.number().int().positive().optional(),
  ofContactId: z.number().int().positive().optional(),
  relationshipTypeId: z.number().int().positive().optional(),
  relationshipTypeName: z.string().min(1).max(255).optional()
});

type RelationshipPayloadForm = z.infer<typeof relationshipPayloadSchema>;

export function registerRelationshipTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_relationship',
    {
      title: 'Manage Monica relationships',
      description:
        'List, inspect, create, update, or delete relationships between contacts. Provide relationshipTypeId or relationshipTypeName to identify the connection.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        relationshipId: z.number().int().positive().optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: relationshipPayloadSchema.optional()
      }
    },
    async ({ action, relationshipId, contactId, limit, page, payload }) => {
      switch (action) {
        case 'list': {
          if (!contactId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide contactId when listing relationships.'
                }
              ]
            };
          }

          const response = await client.listRelationships({ contactId, limit, page });
          const relationships = response.data.map(normalizeRelationship);

          const pagination = response.meta
            ? {
                currentPage: response.meta.current_page,
                lastPage: response.meta.last_page,
                perPage: response.meta.per_page,
                total: response.meta.total
              }
            : undefined;

          const text = relationships.length
            ? `Found ${relationships.length} relationship${relationships.length === 1 ? '' : 's'} for contact ${contactId}.`
            : `No relationships found for contact ${contactId}.`;

          const structuredContent: {
            action: typeof action;
            contactId: number;
            relationships: ReturnType<typeof normalizeRelationship>[];
            pagination?: {
              currentPage: number;
              lastPage: number;
              perPage: number;
              total: number;
            };
          } = {
            action,
            contactId,
            relationships
          };

          if (pagination) {
            structuredContent.pagination = pagination;
          }

          return {
            content: [
              {
                type: 'text' as const,
                text
              }
            ],
            structuredContent
          };
        }

        case 'get': {
          if (!relationshipId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide relationshipId when retrieving a relationship.'
                }
              ]
            };
          }

          const response = await client.getRelationship(relationshipId);
          const relationship = normalizeRelationship(response.data);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Relationship ${relationship.relationshipType.name} between ${relationship.contact.name} and ${relationship.relatedContact.name}.`
              }
            ],
            structuredContent: {
              action,
              relationshipId,
              relationship
            }
          };
        }

        case 'create': {
          if (!payload) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide contactIsId, ofContactId, and relationshipTypeId or relationshipTypeName when creating a relationship.'
                }
              ]
            };
          }

          const relationshipTypeId = await resolveRelationshipTypeId(client, {
            relationshipTypeId: payload.relationshipTypeId,
            relationshipTypeName: payload.relationshipTypeName
          });

          const input = toRelationshipCreatePayload({ ...payload, relationshipTypeId });
          const response = await client.createRelationship(input);
          const relationship = normalizeRelationship(response.data);
          logger.info({ relationshipId: relationship.id }, 'Created Monica relationship');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Linked ${relationship.contact.name} and ${relationship.relatedContact.name} as ${relationship.relationshipType.name}.`
              }
            ],
            structuredContent: {
              action,
              relationship
            }
          };
        }

        case 'update': {
          if (!relationshipId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide relationshipId when updating a relationship.'
                }
              ]
            };
          }

          if (!payload) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide relationshipTypeId or relationshipTypeName when updating a relationship.'
                }
              ]
            };
          }

          const relationshipTypeId = await resolveRelationshipTypeId(client, {
            relationshipTypeId: payload.relationshipTypeId,
            relationshipTypeName: payload.relationshipTypeName
          });

          const input = toRelationshipUpdatePayload({ ...payload, relationshipTypeId });
          const response = await client.updateRelationship(relationshipId, input);
          const relationship = normalizeRelationship(response.data);
          logger.info({ relationshipId }, 'Updated Monica relationship');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated relationship ${relationshipId} to ${relationship.relationshipType.name}.`
              }
            ],
            structuredContent: {
              action,
              relationshipId,
              relationship
            }
          };
        }

        case 'delete': {
          if (!relationshipId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide relationshipId when deleting a relationship.'
                }
              ]
            };
          }

          const result = await client.deleteRelationship(relationshipId);
          logger.info({ relationshipId }, 'Deleted Monica relationship');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Deleted relationship ID ${relationshipId}.`
              }
            ],
            structuredContent: {
              action,
              relationshipId,
              result
            }
          };
        }

        default:
          return {
            isError: true as const,
            content: [
              {
                type: 'text' as const,
                text: `Unsupported action: ${action}.`
              }
            ]
          };
      }
    }
  );
}

function toRelationshipCreatePayload(
  payload: RelationshipPayloadForm & { relationshipTypeId: number }
): CreateRelationshipPayload {
  if (
    typeof payload.contactIsId !== 'number' ||
    typeof payload.ofContactId !== 'number'
  ) {
    throw new Error('contactIsId and ofContactId are required to create a relationship.');
  }

  return {
    contactIsId: payload.contactIsId,
    ofContactId: payload.ofContactId,
    relationshipTypeId: payload.relationshipTypeId
  };
}

function toRelationshipUpdatePayload(
  payload: RelationshipPayloadForm & { relationshipTypeId: number }
): UpdateRelationshipPayload {
  return {
    relationshipTypeId: payload.relationshipTypeId
  };
}
