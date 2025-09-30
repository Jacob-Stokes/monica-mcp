import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { handleContactOperation } from './contacts.js';

/**
 * Thin wrapper tools that delegate to monica_manage_contact with pre-selected sections.
 * These improve tool discoverability while reusing the underlying contact handling logic.
 */

// Schemas matching the parent contact module
const birthdateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact'),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(9999)
  }),
  z.object({
    type: z.literal('age'),
    age: z.number().int().min(0).max(150)
  }),
  z.object({
    type: z.literal('unknown')
  })
]);

const deceasedDateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact'),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(9999)
  }),
  z.object({
    type: z.literal('age'),
    age: z.number().int().min(0).max(150)
  }),
  z.object({
    type: z.literal('unknown')
  })
]);

const contactProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(100).optional().nullable(),
  nickname: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  genderId: z.number().int().positive().optional(),
  genderName: z.string().min(1).max(50).optional(),
  isPartial: z.boolean().optional(),
  isDeceased: z.boolean().optional(),
  birthdate: birthdateSchema.optional(),
  deceasedDate: deceasedDateSchema.optional(),
  remindOnDeceasedDate: z.boolean().optional()
});

const contactFieldPayloadSchema = z.object({
  contactId: z.number().int().positive(),
  contactFieldTypeId: z.number().int().positive().optional(),
  contactFieldTypeName: z.string().min(1).max(255).optional(),
  data: z.string().min(1).max(255)
});

const addressPayloadSchema = z.object({
  contactId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  street: z.string().max(255).optional().nullable(),
  city: z.string().max(255).optional().nullable(),
  province: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(255).optional().nullable(),
  countryId: z.string().max(3).optional().nullable(),
  countryIso: z.string().max(3).optional().nullable(),
  countryName: z.string().max(255).optional().nullable()
});

export function registerContactWrapperTools(context: ToolRegistrationContext): void {
  const { server } = context;

  // Profile wrapper
  const profileInputSchema = {
    action: z.enum(['create', 'update', 'delete']),
    contactId: z.number().int().positive().optional(),
    profile: contactProfileSchema.optional()
  };

  server.registerTool(
    'monica_manage_contact_profile',
    {
      title: 'Manage contact profile',
      description:
        'Create, update, or delete a contact profile. Use this simplified tool instead of monica_manage_contact when working with contact profiles. Provide firstName, lastName, and optional fields like nickname, description, genderName, birthdate, etc. Gender is optional - omit if unknown.',
      inputSchema: profileInputSchema
    },
    async (rawInput) => {
      const input = z.object(profileInputSchema).parse(rawInput);

      return handleContactOperation(
        {
          section: 'profile',
          action: input.action,
          contactId: input.contactId,
          profile: input.profile
        },
        context
      );
    }
  );

  // Contact field wrapper
  const fieldInputSchema = {
    action: z.enum(['list', 'get', 'create', 'update', 'delete']),
    contactId: z.number().int().positive().optional(),
    contactFieldId: z.number().int().positive().optional(),
    fieldPayload: contactFieldPayloadSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional()
  };

  server.registerTool(
    'monica_manage_contact_field',
    {
      title: 'Manage contact fields',
      description:
        'List, get, create, update, or delete contact fields like email addresses, phone numbers, social media handles, etc. Use this simplified tool instead of monica_manage_contact when managing contact fields. Provide contactId and fieldPayload with data and contactFieldTypeName (e.g., "Email", "Phone").',
      inputSchema: fieldInputSchema
    },
    async (rawInput) => {
      const input = z.object(fieldInputSchema).parse(rawInput);

      return handleContactOperation(
        {
          section: 'field',
          action: input.action,
          contactId: input.contactId,
          contactFieldId: input.contactFieldId,
          fieldPayload: input.fieldPayload,
          limit: input.limit,
          page: input.page
        },
        context
      );
    }
  );

  // Address wrapper
  const addressInputSchema = {
    action: z.enum(['list', 'get', 'create', 'update', 'delete']),
    contactId: z.number().int().positive().optional(),
    addressId: z.number().int().positive().optional(),
    addressPayload: addressPayloadSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional()
  };

  server.registerTool(
    'monica_manage_contact_address',
    {
      title: 'Manage contact addresses',
      description:
        'List, get, create, update, or delete contact addresses. Use this simplified tool instead of monica_manage_contact when managing addresses. Provide contactId and addressPayload with name, street, city, province, postalCode, and countryName (country lookup is automatic).',
      inputSchema: addressInputSchema
    },
    async (rawInput) => {
      const input = z.object(addressInputSchema).parse(rawInput);

      return handleContactOperation(
        {
          section: 'address',
          action: input.action,
          contactId: input.contactId,
          addressId: input.addressId,
          addressPayload: input.addressPayload,
          limit: input.limit,
          page: input.page
        },
        context
      );
    }
  );
}