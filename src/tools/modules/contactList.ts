import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeContactDetail, normalizeContactSummary } from '../../utils/formatters.js';
import { buildListResponse, extractPagination, generateListSummary } from '../../utils/responseHelpers.js';
import { resolveGenderNameById } from '../../utils/resolvers.js';
import type { MonicaContact } from '../../types.js';

const detailLevels = ['minimal', 'basic', 'expanded', 'full'] as const;
type DetailLevel = (typeof detailLevels)[number];

const filtersSchema = z
  .object({
    genderId: z.number().int().positive().optional(),
    genderName: z.string().min(1).max(50).optional(),
    tagIds: z.array(z.number().int().positive()).max(25).optional(),
    tagNames: z.array(z.string().min(1).max(255)).max(25).optional(),
    hasEmail: z.boolean().optional(),
    hasPhone: z.boolean().optional(),
    includePartial: z.boolean().optional()
  })
  .optional();

const listContactsInputSchema = z.object({
  detailLevel: z.enum(detailLevels).default('minimal'),
  filters: filtersSchema,
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional()
});

type ListContactsInput = z.infer<typeof listContactsInputSchema>;

export function registerContactListTools(context: ToolRegistrationContext): void {
  const { server, client } = context;

  server.registerTool(
    'monica_list_contacts',
    {
      title: 'List Monica contacts',
      description:
        'Retrieve a paginated list of contacts without requiring a search query. Choose the detail level (minimal/basic/expanded/full) and optional filters (gender, tags, communication details).',
      inputSchema: {
        detailLevel: z.enum(detailLevels).default('minimal'),
        filters: filtersSchema,
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional()
      }
    },
    async (rawInput) => {
      const input = listContactsInputSchema.parse(rawInput);
      const filters = input.filters ?? {};
      const includePartial = filters.includePartial ?? false;
      const requiresContactFields =
        input.detailLevel !== 'minimal' || filters.hasEmail === true || filters.hasPhone === true;
      const hasTagFilters = Boolean(
        (filters.tagIds && filters.tagIds.length > 0) || (filters.tagNames && filters.tagNames.length > 0)
      );
      const requiresTags = input.detailLevel !== 'minimal' && (input.detailLevel !== 'basic' || hasTagFilters);
      const requiresAddresses = input.detailLevel === 'expanded' || input.detailLevel === 'full';

      const genderNameFromId = filters.genderId
        ? await resolveGenderNameById(client, filters.genderId)
        : undefined;
      const normalizedGender = (filters.genderName ?? genderNameFromId)?.trim().toLowerCase();
      const normalizedTagNames = (filters.tagNames ?? []).map((name) => name.trim().toLowerCase());

      const response = await client.listContacts({
        limit: input.limit,
        page: input.page,
        includePartial,
        includeContactFields: requiresContactFields || input.detailLevel === 'full',
        includeTags: requiresTags || input.detailLevel !== 'minimal',
        includeAddresses: requiresAddresses || input.detailLevel === 'full'
      });

      const contacts = response.data.filter((contact) =>
        matchesFilters({
          contact,
          includePartial,
          normalizedGender,
          normalizedTagNames,
          requiredTagIds: filters.tagIds,
          requireEmail: filters.hasEmail,
          requirePhone: filters.hasPhone
        })
      );

      const mapped = contacts.map((contact) =>
        buildContactRepresentation(contact, input.detailLevel as DetailLevel)
      );

      const summary = generateListSummary({
        count: mapped.length,
        itemName: 'contact',
        contextInfo: `detail level ${input.detailLevel}`
      });

      return buildListResponse({
        items: mapped,
        itemName: 'contact',
        summaryText: summary,
        structuredData: {
          action: 'list',
          detailLevel: input.detailLevel,
          filters: {
            ...filters,
            genderName: normalizedGender ? genderNameFromId ?? filters.genderName : filters.genderName
          },
          contacts: mapped
        },
        pagination: extractPagination(response)
      });
    }
  );
}

interface FilterContext {
  contact: MonicaContact;
  includePartial: boolean;
  normalizedGender?: string;
  normalizedTagNames: string[];
  requiredTagIds?: number[];
  requireEmail?: boolean;
  requirePhone?: boolean;
}

function matchesFilters(context: FilterContext): boolean {
  const { contact, includePartial, normalizedGender, normalizedTagNames, requiredTagIds, requireEmail, requirePhone } =
    context;

  if (!includePartial && contact.is_partial) {
    return false;
  }

  const summary = normalizeContactSummary(contact);

  if (normalizedGender && summary.gender?.toLowerCase() !== normalizedGender) {
    return false;
  }

  if (requireEmail && summary.emails.length === 0) {
    return false;
  }

  if (requirePhone && summary.phones.length === 0) {
    return false;
  }

  const contactTags = contact.tags ?? [];

  if (requiredTagIds && requiredTagIds.length > 0) {
    const tagIdSet = new Set(contactTags.map((tag) => tag.id));
    for (const tagId of requiredTagIds) {
      if (!tagIdSet.has(tagId)) {
        return false;
      }
    }
  }

  if (normalizedTagNames.length > 0) {
    const tagNameSet = new Set(contactTags.map((tag) => tag.name.trim().toLowerCase()));
    for (const name of normalizedTagNames) {
      if (!tagNameSet.has(name)) {
        return false;
      }
    }
  }

  return true;
}

function buildContactRepresentation(contact: MonicaContact, detailLevel: DetailLevel) {
  switch (detailLevel) {
    case 'minimal':
      return {
        id: contact.id,
        name: buildContactName(contact)
      };

    case 'basic': {
      const summary = normalizeContactSummary(contact);
      return {
        id: summary.id,
        name: summary.name,
        gender: summary.gender ?? null,
        primaryEmail: summary.emails[0] ?? null,
        primaryPhone: summary.phones[0] ?? null,
        tagNames: (contact.tags ?? []).map((tag) => tag.name)
      };
    }

    case 'expanded': {
      const summary = normalizeContactSummary(contact);
      return {
        id: summary.id,
        name: summary.name,
        gender: summary.gender ?? null,
        primaryEmail: summary.emails[0] ?? null,
        primaryPhone: summary.phones[0] ?? null,
        tagNames: (contact.tags ?? []).map((tag) => tag.name),
        addresses: buildAddressSummaries(contact),
        createdAt: contact.created_at ?? null,
        updatedAt: contact.updated_at ?? null,
        isPartial: contact.is_partial
      };
    }

    case 'full':
      return normalizeContactDetail(contact);

    default:
      return { id: contact.id, name: buildContactName(contact) };
  }
}

function buildContactName(contact: MonicaContact): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  if (contact.nickname) {
    return contact.nickname;
  }
  return `Contact #${contact.id}`;
}

function buildAddressSummaries(contact: MonicaContact) {
  const addresses = contact.information?.addresses ?? [];
  return addresses.map((address) => ({
    street: address.street ?? undefined,
    city: address.city ?? undefined,
    province: address.state ?? undefined,
    postalCode: address.postal_code ?? undefined,
    country: address.country ?? undefined
  }));
}
