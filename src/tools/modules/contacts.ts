import { z } from 'zod';
import type {
  ContactProfileInput,
  CreateAddressPayload,
  CreateContactFieldPayload,
  UpdateAddressPayload,
  UpdateContactFieldPayload
} from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import {
  buildContactSummary,
  normalizeAddress,
  normalizeContactDetail,
  normalizeContactField
} from '../../utils/formatters.js';
import {
  resolveContactFieldTypeId,
  resolveCountryId,
  resolveGenderId
} from '../../utils/resolvers.js';

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

type ContactProfileForm = z.infer<typeof contactProfileSchema> & { genderId?: number };

const contactFieldPayloadSchema = z
  .object({
    contactId: z.number().int().positive(),
    contactFieldTypeId: z.number().int().positive().optional(),
    contactFieldTypeName: z.string().min(1).max(255).optional(),
    data: z.string().min(1).max(255)
  })
  .superRefine((data, ctx) => {
    if (typeof data.contactFieldTypeId !== 'number' && !data.contactFieldTypeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide contactFieldTypeId or contactFieldTypeName.'
      });
    }
  });

type ContactFieldPayloadForm = z.infer<typeof contactFieldPayloadSchema>;

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

type AddressPayloadForm = z.infer<typeof addressPayloadSchema>;

const contactToolInputShape = {
  section: z.enum(['summary', 'profile', 'field', 'address']),
  action: z.enum(['create', 'update', 'delete', 'list', 'get']).optional(),
  contactId: z.number().int().positive().optional(),
  contactFieldId: z.number().int().positive().optional(),
  addressId: z.number().int().positive().optional(),
  includeContactFields: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
  profile: contactProfileSchema.optional(),
  fieldPayload: contactFieldPayloadSchema.optional(),
  addressPayload: addressPayloadSchema.optional()
} as const;

const contactToolInputSchema = z.object(contactToolInputShape).superRefine((data, ctx) => {
  switch (data.section) {
    case 'summary':
      if (typeof data.contactId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactId when retrieving a summary.' });
      }
      break;

    case 'profile': {
      if (!data.action || !['create', 'update', 'delete'].includes(data.action)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use action create, update, or delete for profile operations.' });
        break;
      }

      if (data.action === 'create' && !data.profile) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide profile details when creating a contact.' });
      }

      if (data.action === 'update') {
        if (typeof data.contactId !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactId when updating a contact.' });
        }
        if (!data.profile) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide profile details when updating a contact.' });
        }
      }

      if (data.action === 'delete' && typeof data.contactId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactId when deleting a contact.' });
      }
      break;
    }

    case 'field': {
      if (!data.action || !['list', 'get', 'create', 'update', 'delete'].includes(data.action)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use action list/get/create/update/delete for contact fields.' });
        break;
      }

      if (data.action === 'list' && typeof data.contactId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactId when listing contact fields.' });
      }

      if (data.action === 'get' && typeof data.contactFieldId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactFieldId when retrieving a contact field.' });
      }

      if (['create', 'update'].includes(data.action) && !data.fieldPayload) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contact field details for this action.' });
      }

      if (['update', 'delete'].includes(data.action) && typeof data.contactFieldId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactFieldId when updating or deleting a contact field.' });
      }
      break;
    }

    case 'address': {
      if (!data.action || !['list', 'get', 'create', 'update', 'delete'].includes(data.action)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use action list/get/create/update/delete for addresses.' });
        break;
      }

      if (data.action === 'list' && typeof data.contactId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide contactId when listing addresses.' });
      }

      if (data.action === 'get' && typeof data.addressId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide addressId when retrieving an address.' });
      }

      if (['create', 'update'].includes(data.action) && !data.addressPayload) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide address details for this action.' });
      }

      if (['update', 'delete'].includes(data.action) && typeof data.addressId !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide addressId when updating or deleting an address.' });
      }
      break;
    }

    default:
      break;
  }
});

type ContactToolInput = z.infer<typeof contactToolInputSchema>;

/**
 * Shared handler for contact operations - used by both the main tool and wrapper tools
 */
export async function handleContactOperation(
  input: ContactToolInput,
  context: ToolRegistrationContext
): Promise<any> {
  const { client, logger } = context;

      switch (input.section) {
        case 'summary': {
          const response = await client.getContact(input.contactId!, input.includeContactFields);
          const contact = normalizeContactDetail(response.data);
          const summary = buildContactSummary(response.data);

          return {
            content: [
              {
                type: 'text' as const,
                text: summary
              }
            ],
            structuredContent: {
              section: input.section,
              contact
            }
          };
        }

        case 'profile': {
          if (input.action === 'delete') {
            await client.deleteContact(input.contactId!);
            logger.info({ contactId: input.contactId }, 'Deleted Monica contact');

            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Deleted contact ID ${input.contactId}.`
                }
              ],
              structuredContent: {
                section: input.section,
                action: input.action,
                contactId: input.contactId
              }
            };
          }

          const profile = input.profile!;
          const contactId = input.contactId;
          const genderId = await resolveGenderId(client, profile.genderId, profile.genderName);
          const payload = toContactProfileInput({ ...profile, genderId });

          if (input.action === 'create') {
            const response = await client.createContact(payload);
            const contact = normalizeContactDetail(response.data);
            logger.info({ contactId: contact.id }, 'Created Monica contact');

            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Created contact ${contact.name || `#${contact.id}`} (ID ${contact.id}).`
                }
              ],
              structuredContent: {
                section: input.section,
                action: input.action,
                contact
              }
            };
          }

          const response = await client.updateContact(contactId!, payload);
          const contact = normalizeContactDetail(response.data);
          logger.info({ contactId }, 'Updated Monica contact');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated contact ${contact.name || `#${contact.id}`} (ID ${contact.id}).`
              }
            ],
            structuredContent: {
              section: input.section,
              action: input.action,
              contactId,
              contact
            }
          };
        }

        case 'field': {
          switch (input.action) {
            case 'list': {
              const response = await client.listContactFields({
                contactId: input.contactId!,
                limit: input.limit,
                page: input.page
              });
              const fields = response.data.map(normalizeContactField);

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: fields.length
                      ? `Fetched ${fields.length} contact field${fields.length === 1 ? '' : 's'} for contact ${input.contactId}.`
                      : `No contact fields found for contact ${input.contactId}.`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  contactId: input.contactId,
                  fields,
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
              const response = await client.getContactField(input.contactFieldId!);
              const field = normalizeContactField(response.data);

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Retrieved contact field ${field.type.name} (ID ${field.id}).`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  field
                }
              };
            }

            case 'create': {
              const payload = input.fieldPayload!;
              const contactFieldTypeId = await resolveContactFieldTypeId(client, {
                contactFieldTypeId: payload.contactFieldTypeId,
                contactFieldTypeName: payload.contactFieldTypeName
              });

              const result = await client.createContactField(
                toContactFieldPayloadInput({ ...payload, contactFieldTypeId })
              );
              const field = normalizeContactField(result.data);
              logger.info({ contactFieldId: field.id, contactId: field.contactId }, 'Created Monica contact field');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Created contact field ${field.type.name} (ID ${field.id}) for contact ${field.contactId}.`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  field
                }
              };
            }

            case 'update': {
              const payload = input.fieldPayload!;
              const contactFieldTypeId = await resolveContactFieldTypeId(client, {
                contactFieldTypeId: payload.contactFieldTypeId,
                contactFieldTypeName: payload.contactFieldTypeName
              });

              const result = await client.updateContactField(
                input.contactFieldId!,
                toContactFieldPayloadInput({ ...payload, contactFieldTypeId })
              );
              const field = normalizeContactField(result.data);
              logger.info({ contactFieldId: input.contactFieldId }, 'Updated Monica contact field');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Updated contact field ${field.type.name} (ID ${field.id}).`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  contactFieldId: input.contactFieldId,
                  field
                }
              };
            }

            case 'delete': {
              const result = await client.deleteContactField(input.contactFieldId!);
              logger.info({ contactFieldId: input.contactFieldId }, 'Deleted Monica contact field');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Deleted contact field ID ${input.contactFieldId}.`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  contactFieldId: input.contactFieldId,
                  result
                }
              };
            }

            default:
              return unreachable(input.action as never);
          }
        }

        case 'address': {
          switch (input.action) {
            case 'list': {
              const response = await client.listAddresses({
                contactId: input.contactId!,
                limit: input.limit,
                page: input.page
              });
              const addresses = response.data.map(normalizeAddress);

              const summary = addresses.length
                ? `Fetched ${addresses.length} address${addresses.length === 1 ? '' : 'es'} for contact ${input.contactId}.`
                : `No addresses found for contact ${input.contactId}.`;

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: summary
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  contactId: input.contactId,
                  addresses,
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
              const response = await client.getAddress(input.addressId!);
              const address = normalizeAddress(response.data);

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Retrieved address "${address.name}" (ID ${address.id}).`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  address
                }
              };
            }

            case 'create': {
              const payload = input.addressPayload!;
              const countryId = await resolveCountryId(client, {
                countryId: payload.countryId,
                countryIso: payload.countryIso,
                countryName: payload.countryName
              });

              const result = await client.createAddress(
                toAddressPayloadInput({ ...payload, countryId })
              );
              const address = normalizeAddress(result.data);
              logger.info({ addressId: address.id, contactId: address.contact.id }, 'Created Monica address');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Created address "${address.name}" (ID ${address.id}) for contact ${address.contact.id}.`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  address
                }
              };
            }

            case 'update': {
              const payload = input.addressPayload!;
              const countryId = await resolveCountryId(client, {
                countryId: payload.countryId,
                countryIso: payload.countryIso,
                countryName: payload.countryName
              });

              const result = await client.updateAddress(
                input.addressId!,
                toAddressPayloadInput({ ...payload, countryId })
              );
              const address = normalizeAddress(result.data);
              logger.info({ addressId: input.addressId }, 'Updated Monica address');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Updated address "${address.name}" (ID ${address.id}).`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  addressId: input.addressId,
                  address
                }
              };
            }

            case 'delete': {
              const result = await client.deleteAddress(input.addressId!);
              logger.info({ addressId: input.addressId }, 'Deleted Monica address');

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Deleted address ID ${input.addressId}.`
                  }
                ],
                structuredContent: {
                  section: input.section,
                  action: input.action,
                  addressId: input.addressId,
                  result
                }
              };
            }

            default:
              return unreachable(input.action as never);
          }
        }

        default:
          return unreachable(input.section as never);
      }
}

export function registerContactTools(context: ToolRegistrationContext): void {
  const { server } = context;

  server.registerTool(
    'monica_manage_contact',
    {
      title: 'Manage Monica contact',
      description:
        'Advanced contact management tool with section-based operations. Set section to "summary" to retrieve full contact details, "profile" for contact creation/updates, "field" for managing contact fields (email/phone/etc), or "address" for address management. For simpler operations, prefer the dedicated wrapper tools: monica_manage_contact_profile, monica_manage_contact_field, or monica_manage_contact_address.',
      inputSchema: contactToolInputShape
    },
    async (rawInput) => {
      const input = contactToolInputSchema.parse(rawInput);
      return handleContactOperation(input, context);
    }
  );
}

function toContactProfileInput(profile: ContactProfileForm & { genderId?: number }): ContactProfileInput {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName ?? null,
    nickname: profile.nickname ?? null,
    description: profile.description ?? null,
    genderId: profile.genderId,
    isPartial: profile.isPartial,
    isDeceased: profile.isDeceased,
    birthdate: profile.birthdate as ContactProfileInput['birthdate'],
    deceasedDate: profile.deceasedDate as ContactProfileInput['deceasedDate'],
    remindOnDeceasedDate: profile.remindOnDeceasedDate
  };
}

function toContactFieldPayloadInput(
  payload: ContactFieldPayloadForm & { contactFieldTypeId: number }
): CreateContactFieldPayload & UpdateContactFieldPayload {
  return {
    contactId: payload.contactId,
    contactFieldTypeId: payload.contactFieldTypeId,
    data: payload.data
  };
}

function toAddressPayloadInput(
  payload: AddressPayloadForm & { countryId: string | null }
): CreateAddressPayload & UpdateAddressPayload {
  return {
    contactId: payload.contactId,
    name: payload.name,
    street: payload.street ?? null,
    city: payload.city ?? null,
    province: payload.province ?? null,
    postalCode: payload.postalCode ?? null,
    countryId: payload.countryId
  };
}

function unreachable(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
