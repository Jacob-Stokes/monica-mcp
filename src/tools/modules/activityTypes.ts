import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeActivityType } from '../../utils/formatters.js';
import {
  buildListResponse,
  buildGetResponse,
  buildMutationResponse,
  extractPagination,
  generateListSummary,
  generateCreateSummary,
  generateUpdateSummary,
  generateDeleteSummary
} from '../../utils/responseHelpers.js';

const activityTypePayloadSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.number().int().positive(),
  locationType: z.string().max(255).optional().nullable()
});

type ActivityTypePayload = z.infer<typeof activityTypePayloadSchema>;

const activityTypeInputShape = {
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  activityTypeId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
  payload: activityTypePayloadSchema.optional()
} as const;

const activityTypeInputSchema = z.object(activityTypeInputShape).superRefine((data, ctx) => {
  switch (data.action) {
    case 'list':
      return;
    case 'get':
    case 'delete':
      if (data.activityTypeId == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['activityTypeId'],
          message: 'Provide activityTypeId for this action.'
        });
      }
      return;
    case 'create':
      if (!data.payload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Provide payload when creating an activity type.'
        });
      }
      return;
    case 'update':
      if (data.activityTypeId == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['activityTypeId'],
          message: 'Provide activityTypeId when updating an activity type.'
        });
      }
      if (!data.payload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Provide payload when updating an activity type.'
        });
      }
      return;
    default:
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported action: ${String(data.action)}`
      });
  }
});

type ActivityTypeInput = z.infer<typeof activityTypeInputSchema>;

type CreateInput = ActivityTypeInput & { action: 'create'; payload: ActivityTypePayload };

type UpdateInput = ActivityTypeInput & {
  action: 'update';
  activityTypeId: number;
  payload: ActivityTypePayload;
};

type IdInput = ActivityTypeInput & { activityTypeId: number };

export function registerActivityTypeTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_activity_type',
    {
      title: 'Manage activity types',
      description:
        'List, inspect, create, update, or delete Monica activity types (e.g., Meeting, Coffee, Meal). Use this to expand the catalog with custom activity names before logging activities.',
      inputSchema: activityTypeInputShape
    },
    async (rawInput) => {
      const input = activityTypeInputSchema.parse(rawInput);

      switch (input.action) {
        case 'list': {
          const response = await client.listActivityTypes({ limit: input.limit, page: input.page });
          const activityTypes = response.data.map(normalizeActivityType);
          const summary = generateListSummary({ count: activityTypes.length, itemName: 'activity type' });

          return buildListResponse({
            items: activityTypes,
            itemName: 'activity type',
            summaryText: summary,
            structuredData: {
              action: input.action,
              activityTypes
            },
            pagination: extractPagination(response)
          });
        }

        case 'get': {
          const typedInput = input as IdInput;
          const response = await client.getActivityType(typedInput.activityTypeId);
          const activityType = normalizeActivityType(response.data);

          return buildGetResponse({
            item: activityType,
            summaryText: `Activity type ${activityType.name} (ID ${activityType.id}).`,
            structuredData: {
              action: input.action,
              activityTypeId: typedInput.activityTypeId,
              activityType
            }
          });
        }

        case 'create': {
          const typedInput = input as CreateInput;
          const response = await client.createActivityType(toActivityTypePayload(typedInput.payload));
          const activityType = normalizeActivityType(response.data);
          logger.info({ activityTypeId: activityType.id }, 'Created Monica activity type');

          return buildMutationResponse({
            action: 'create',
            summaryText: generateCreateSummary({
              itemName: 'activity type',
              itemId: activityType.id,
              itemLabel: activityType.name
            }),
            structuredData: {
              activityType
            }
          });
        }

        case 'update': {
          const typedInput = input as UpdateInput;
          const response = await client.updateActivityType(
            typedInput.activityTypeId,
            toActivityTypePayload(typedInput.payload)
          );
          const activityType = normalizeActivityType(response.data);
          logger.info({ activityTypeId: activityType.id }, 'Updated Monica activity type');

          return buildMutationResponse({
            action: 'update',
            summaryText: generateUpdateSummary({
              itemName: 'activity type',
              itemId: activityType.id,
              itemLabel: activityType.name
            }),
            structuredData: {
              activityTypeId: activityType.id,
              activityType
            }
          });
        }

        case 'delete': {
          const typedInput = input as IdInput;
          await client.deleteActivityType(typedInput.activityTypeId);
          logger.info({ activityTypeId: typedInput.activityTypeId }, 'Deleted Monica activity type');

          return buildMutationResponse({
            action: 'delete',
            summaryText: generateDeleteSummary({
              itemName: 'activity type',
              itemId: typedInput.activityTypeId
            }),
            structuredData: {
              activityTypeId: typedInput.activityTypeId,
              deleted: true
            }
          });
        }

        default:
          throw new Error(`Unsupported action: ${String((input as ActivityTypeInput).action)}`);
      }
    }
  );
}

function toActivityTypePayload(payload: ActivityTypePayload) {
  return {
    name: payload.name,
    categoryId: payload.categoryId,
    locationType: payload.locationType ?? null
  };
}
