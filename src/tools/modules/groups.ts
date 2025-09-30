import { z } from 'zod';
import type { CreateGroupPayload, UpdateGroupPayload } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeGroup } from '../../utils/formatters.js';

const groupPayloadSchema = z.object({
  name: z.string().min(1).max(255)
});

type GroupPayloadForm = z.infer<typeof groupPayloadSchema>;

export function registerGroupTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_group',
    {
      title: 'Manage Monica groups',
      description:
        'List, inspect, create, update, or delete contact groups. Use this to organize contacts into named collections (e.g., "Family", "Travel buddies").',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        groupId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: groupPayloadSchema.optional()
      }
    },
    async ({ action, groupId, limit, page, payload }) => {
      switch (action) {
        case 'list': {
          const response = await client.listGroups({ limit, page });
          const groups = response.data.map(normalizeGroup);

          const summaryLines = groups.map((group) => {
            const contactLabel = group.contactCount === 1 ? 'contact' : 'contacts';
            return `• ID ${group.id}: ${group.name} (${group.contactCount} ${contactLabel})`;
          });

          const text = groups.length
            ? `Found ${groups.length} group${groups.length === 1 ? '' : 's'}:\n\n${summaryLines.join('\n')}`
            : 'No groups found.';

          return {
            content: [
              {
                type: 'text' as const,
                text
              }
            ],
            structuredContent: {
              action,
              groups,
              pagination: {
                currentPage: response.meta.current_page,
                lastPage: response.meta.last_page,
                perPage: response.meta.per_page,
                total: response.meta.total
              }
            }
          };
        }

        case 'get': {
          if (!groupId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide groupId when retrieving a group.'
                }
              ]
            };
          }

          const response = await client.getGroup(groupId);
          const group = normalizeGroup(response.data);
          const contactNames = group.contacts.map((contact) => contact.name || `Contact ${contact.id}`);
          const contactsSummary = contactNames.length
            ? `Members: ${contactNames.join(', ')}`
            : 'Members: none yet.';

          return {
            content: [
              {
                type: 'text' as const,
                text: `Group ${group.name} (ID ${group.id}). ${contactsSummary}`
              }
            ],
            structuredContent: {
              action,
              groupId,
              group
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
                  text: 'Provide a group payload when creating a group (name).'
                }
              ]
            };
          }

          const response = await client.createGroup(toGroupCreatePayload(payload));
          const group = normalizeGroup(response.data);
          logger.info({ groupId: group.id }, 'Created Monica group');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Created group ${group.name} (ID ${group.id}).`
              }
            ],
            structuredContent: {
              action,
              group
            }
          };
        }

        case 'update': {
          if (!groupId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide groupId when updating a group.'
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
                  text: 'Provide a group payload when updating a group (name).'
                }
              ]
            };
          }

          const response = await client.updateGroup(groupId, toGroupUpdatePayload(payload));
          const group = normalizeGroup(response.data);
          logger.info({ groupId }, 'Updated Monica group');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated group ${group.name} (ID ${group.id}).`
              }
            ],
            structuredContent: {
              action,
              groupId,
              group
            }
          };
        }

        case 'delete': {
          if (!groupId) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide groupId when deleting a group.'
                }
              ]
            };
          }

          const result = await client.deleteGroup(groupId);
          logger.info({ groupId }, 'Deleted Monica group');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Deleted group ID ${groupId}.`
              }
            ],
            structuredContent: {
              action,
              groupId,
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

function toGroupCreatePayload(payload: GroupPayloadForm): CreateGroupPayload {
  return {
    name: payload.name
  };
}

function toGroupUpdatePayload(payload: GroupPayloadForm): UpdateGroupPayload {
  return {
    name: payload.name
  };
}
