import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeContactFieldType } from '../../utils/formatters.js';
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

const contactFieldTypePayloadSchema = z.object({
  name: z.string().min(1).max(255),
  fontawesomeIcon: z.string().max(255).optional().nullable(),
  protocol: z.string().max(255).optional().nullable(),
  delible: z.boolean().optional(),
  kind: z.string().max(255).optional().nullable()
});

type ContactFieldTypePayload = z.infer<typeof contactFieldTypePayloadSchema>;

const contactFieldTypeInputShape = {
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  contactFieldTypeId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
  payload: contactFieldTypePayloadSchema.optional()
} as const;

const contactFieldTypeInputSchema = z.object(contactFieldTypeInputShape).superRefine((data, ctx) => {
  switch (data.action) {
    case 'list':
      return;

    case 'get':
    case 'delete':
      if (data.contactFieldTypeId == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactFieldTypeId'],
          message: 'Provide contactFieldTypeId for this action.'
        });
      }
      return;

    case 'create':
      if (!data.payload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Provide payload when creating a contact field type.'
        });
      }
      return;

    case 'update':
      if (data.contactFieldTypeId == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contactFieldTypeId'],
          message: 'Provide contactFieldTypeId when updating a contact field type.'
        });
      }
      if (!data.payload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Provide payload when updating a contact field type.'
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

type ContactFieldTypeInput = z.infer<typeof contactFieldTypeInputSchema>;

type CreateInput = ContactFieldTypeInput & { action: 'create'; payload: ContactFieldTypePayload };

type UpdateInput = ContactFieldTypeInput & {
  action: 'update';
  contactFieldTypeId: number;
  payload: ContactFieldTypePayload;
};

type IdInput = ContactFieldTypeInput & { contactFieldTypeId: number };

export function registerContactFieldTypeTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_contact_field_type',
    {
      title: 'Manage contact field types',
      description:
        'List, inspect, create, update, or delete contact field types (e.g., Email, Twitter, Instagram). Use this when you need new field types for social accounts or custom data.',
      inputSchema: contactFieldTypeInputShape
    },
    async (rawInput) => {
      const input = contactFieldTypeInputSchema.parse(rawInput);

      switch (input.action) {
        case 'list': {
          const response = await client.listContactFieldTypes({
            limit: input.limit,
            page: input.page
          });
          const contactFieldTypes = response.data.map(normalizeContactFieldType);
          const summary = generateListSummary({
            count: contactFieldTypes.length,
            itemName: 'contact field type'
          });

          return buildListResponse({
            items: contactFieldTypes,
            itemName: 'contact field type',
            summaryText: summary,
            structuredData: {
              action: input.action,
              contactFieldTypes
            },
            pagination: extractPagination(response)
          });
        }

        case 'get': {
          const typedInput = input as IdInput;
          const response = await client.getContactFieldType(typedInput.contactFieldTypeId);
          const contactFieldType = normalizeContactFieldType(response.data);

          return buildGetResponse({
            item: contactFieldType,
            summaryText: `Contact field type ${contactFieldType.name} (ID ${contactFieldType.id}).`,
            structuredData: {
              action: input.action,
              contactFieldTypeId: typedInput.contactFieldTypeId,
              contactFieldType
            }
          });
        }

        case 'create': {
          const typedInput = input as CreateInput;
          const response = await client.createContactFieldType(typedInput.payload);
          const contactFieldType = normalizeContactFieldType(response.data);
          logger.info({ contactFieldTypeId: contactFieldType.id }, 'Created Monica contact field type');

          return buildMutationResponse({
            action: 'create',
            summaryText: generateCreateSummary({
              itemName: 'contact field type',
              itemId: contactFieldType.id,
              itemLabel: contactFieldType.name
            }),
            structuredData: {
              contactFieldType
            }
          });
        }

        case 'update': {
          const typedInput = input as UpdateInput;
          const response = await client.updateContactFieldType(
            typedInput.contactFieldTypeId,
            typedInput.payload
          );
          const contactFieldType = normalizeContactFieldType(response.data);
          logger.info({ contactFieldTypeId: contactFieldType.id }, 'Updated Monica contact field type');

          return buildMutationResponse({
            action: 'update',
            summaryText: generateUpdateSummary({
              itemName: 'contact field type',
              itemId: contactFieldType.id,
              itemLabel: contactFieldType.name
            }),
            structuredData: {
              contactFieldTypeId: contactFieldType.id,
              contactFieldType
            }
          });
        }

        case 'delete': {
          const typedInput = input as IdInput;
          await client.deleteContactFieldType(typedInput.contactFieldTypeId);
          logger.info({ contactFieldTypeId: typedInput.contactFieldTypeId }, 'Deleted Monica contact field type');

          return buildMutationResponse({
            action: 'delete',
            summaryText: generateDeleteSummary({
              itemName: 'contact field type',
              itemId: typedInput.contactFieldTypeId
            }),
            structuredData: {
              contactFieldTypeId: typedInput.contactFieldTypeId,
              deleted: true
            }
          });
        }

        default:
          throw new Error(`Unsupported action: ${String((input as ContactFieldTypeInput).action)}`);
      }
    }
  );
}
