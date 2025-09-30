import { z } from 'zod';
import type { CreateActivityPayload, UpdateActivityPayload } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeActivity } from '../../utils/formatters.js';
import { resolveActivityTypeId } from '../../utils/resolvers.js';

const activityPayloadSchema = z
  .object({
    activityTypeId: z.number().int().positive().optional(),
    activityTypeName: z.string().min(1).max(255).optional(),
    summary: z.string().min(1).max(255),
    description: z.string().max(1_000_000).optional().nullable(),
    happenedAt: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'happenedAt must be in YYYY-MM-DD format.'),
    contactIds: z.array(z.number().int().positive()).min(1, 'Provide at least one contact ID.'),
    emotionIds: z.array(z.number().int().positive()).optional()
  })
  .superRefine((data, ctx) => {
    if (typeof data.activityTypeId !== 'number' && !data.activityTypeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide activityTypeId or activityTypeName.'
      });
    }
  });

type ActivityPayloadForm = z.infer<typeof activityPayloadSchema>;

export function registerActivityTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_activity',
    {
      title: 'Manage Monica activities',
      description:
        'List, inspect, create, update, or delete activities (meetings, events, shared interactions). Provide either activityTypeId or activityTypeName.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        activityId: z.number().int().positive().optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: activityPayloadSchema.optional()
      }
    },
    async ({ action, activityId, contactId, limit, page, payload }) => {
      if (action === 'list') {
        const response = await client.listActivities({ contactId, limit, page });
        const activities = response.data.map(normalizeActivity);
        const scope = contactId ? `contact ${contactId}` : 'your account';
        const summary = activities.length
          ? `Fetched ${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} for ${scope}.`
          : `No activities found for ${scope}.`;

        return {
          content: [
            {
              type: 'text' as const,
              text: summary
            }
          ],
          structuredContent: {
            action,
            contactId,
            activities,
            pagination: {
              currentPage: response.meta.current_page,
              lastPage: response.meta.last_page,
              perPage: response.meta.per_page,
              total: response.meta.total
            }
          }
        };
      }

      if (action === 'get') {
        if (!activityId) {
          return {
            isError: true as const,
            content: [
              {
                type: 'text' as const,
                text: 'Provide activityId when retrieving an activity.'
              }
            ]
          };
        }

        const response = await client.getActivity(activityId);
        const activity = normalizeActivity(response.data);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Activity ${activity.summary || `#${activity.id}`} (ID ${activity.id}).`
            }
          ],
          structuredContent: {
            action,
            activity
          }
        };
      }

      if (action === 'create') {
        if (!payload) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide an activity payload when creating an activity.' }
            ]
          };
        }

        const activityTypeId = await resolveActivityTypeId(client, {
          activityTypeId: payload.activityTypeId,
          activityTypeName: payload.activityTypeName
        });

        const result = await client.createActivity(
          toActivityPayloadInput({ ...payload, activityTypeId })
        );
        const activity = normalizeActivity(result.data);
        logger.info({ activityId: activity.id }, 'Created Monica activity');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Created activity ${activity.summary || `#${activity.id}`} (ID ${activity.id}).`
            }
          ],
          structuredContent: {
            action,
            activity
          }
        };
      }

      if (action === 'update') {
        if (!activityId) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide activityId when updating an activity.' }
            ]
          };
        }

        if (!payload) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide an activity payload when updating an activity.' }
            ]
          };
        }

        const activityTypeId = await resolveActivityTypeId(client, {
          activityTypeId: payload.activityTypeId,
          activityTypeName: payload.activityTypeName
        });

        const result = await client.updateActivity(
          activityId,
          toActivityPayloadInput({ ...payload, activityTypeId })
        );
        const activity = normalizeActivity(result.data);
        logger.info({ activityId }, 'Updated Monica activity');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Updated activity ${activity.summary || `#${activity.id}`} (ID ${activity.id}).`
            }
          ],
          structuredContent: {
            action,
            activityId,
            activity
          }
        };
      }

      if (!activityId) {
        return {
          isError: true as const,
          content: [
            { type: 'text' as const, text: 'Provide activityId when deleting an activity.' }
          ]
        };
      }

      const result = await client.deleteActivity(activityId);
      logger.info({ activityId }, 'Deleted Monica activity');

      return {
        content: [
          { type: 'text' as const, text: `Deleted activity ID ${activityId}.` }
        ],
        structuredContent: {
          action,
          activityId,
          result
        }
      };
    }
  );

}

function toActivityPayloadInput(
  payload: ActivityPayloadForm & { activityTypeId: number }
): CreateActivityPayload & UpdateActivityPayload {
  return {
    activityTypeId: payload.activityTypeId,
    summary: payload.summary,
    description: payload.description ?? null,
    happenedAt: payload.happenedAt,
    contactIds: payload.contactIds,
    emotionIds: payload.emotionIds && payload.emotionIds.length ? payload.emotionIds : undefined
  };
}
