import { z } from 'zod';
import type { CreateTagPayload, UpdateTagPayload } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeTag } from '../../utils/formatters.js';

const tagPayloadSchema = z.object({
  name: z.string().min(1).max(255)
});

type TagPayloadForm = z.infer<typeof tagPayloadSchema>;

export function registerTagTools(context: ToolRegistrationContext): void {
  const { server, client } = context;

  server.registerTool(
    'monica_manage_tag',
    {
      title: 'Manage Monica tags',
      description: 'List, inspect, create, update, or delete tags. Tags allow you to group and categorize contacts.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        tagId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: tagPayloadSchema.optional()
      }
    },
    async ({ action, tagId, payload, limit, page }) => {
      switch (action) {
        case 'list': {
          const result = await client.listTags(limit, page);
          const tags = result.data.map(normalizeTag);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Found ${result.meta.total} tags:\n${tags.map((tag) => `• ${tag.name} (ID: ${tag.id})`).join('\n')}`
              }
            ]
          };
        }

        case 'get': {
          if (!tagId) {
            throw new Error('tagId is required for get action');
          }

          const result = await client.getTag(tagId);
          const tag = normalizeTag(result.data);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Tag Details:\n• Name: ${tag.name}\n• Slug: ${tag.nameSlug}\n• Created: ${tag.createdAt}\n• Updated: ${tag.updatedAt}`
              }
            ]
          };
        }

        case 'create': {
          if (!payload) {
            throw new Error('payload is required for create action');
          }

          const input = toTagPayloadInput(payload);
          const result = await client.createTag(input);
          const tag = normalizeTag(result.data);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Created tag "${tag.name}" (ID: ${tag.id})`
              }
            ]
          };
        }

        case 'update': {
          if (!tagId) {
            throw new Error('tagId is required for update action');
          }
          if (!payload) {
            throw new Error('payload is required for update action');
          }

          const input = toTagPayloadInput(payload);
          const result = await client.updateTag(tagId, input);
          const tag = normalizeTag(result.data);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated tag "${tag.name}" (ID: ${tag.id})`
              }
            ]
          };
        }

        case 'delete': {
          if (!tagId) {
            throw new Error('tagId is required for delete action');
          }

          await client.deleteTag(tagId);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Deleted tag with ID ${tagId}`
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}

function toTagPayloadInput(payload: TagPayloadForm): CreateTagPayload & UpdateTagPayload {
  return {
    name: payload.name
  };
}
