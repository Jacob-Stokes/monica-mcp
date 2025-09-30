import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import {
  normalizeActivityType,
  normalizeContactFieldType,
  normalizeCountry,
  normalizeGender,
  normalizeRelationshipType,
  normalizeCurrency,
  normalizeOccupation
} from '../../utils/formatters.js';

const metadataResourceSchema = z.enum([
  'genders',
  'countries',
  'contactFieldTypes',
  'activityTypes',
  'relationshipTypes',
  'currencies',
  'occupations'
]);

type MetadataResource = z.infer<typeof metadataResourceSchema>;

export function registerMetadataTools(context: ToolRegistrationContext): void {
  const { server, client } = context;

  server.registerTool(
    'monica_browse_metadata',
    {
      title: 'Browse Monica metadata catalogs',
      description:
        'Inspect Monica lookup catalogs (genders, countries, contact field types, activity types, relationship types). Helpful when you need to confirm the exact name/ID before performing other actions.',
      inputSchema: {
        resource: metadataResourceSchema,
        search: z.string().min(1).max(255).optional(),
        limit: z.number().int().min(1).max(250).optional(),
        page: z.number().int().min(1).optional()
      }
    },
    async ({ resource, search, limit, page }) => {
      const query = search?.trim().toLowerCase();
      const { items, meta } = await fetchResource({ client, resource, limit, page });

      const filteredItems = query ? filterByQuery(resource, items, query) : items;
      const label = resourceLabels[resource];
      const summary = buildSummary(label, filteredItems.length, query, meta.currentPage, meta.lastPage);

      return {
        content: [
          {
            type: 'text' as const,
            text: summary
          }
        ],
        structuredContent: {
          resource,
          search: search ?? null,
          items: filteredItems,
          pagination: meta
        }
      };
    }
  );
}

interface FetchResourceArgs {
  client: ToolRegistrationContext['client'];
  resource: MetadataResource;
  limit?: number;
  page?: number;
}

async function fetchResource({ client, resource, limit, page }: FetchResourceArgs) {
  switch (resource) {
    case 'genders': {
      const response = await client.listGenders(limit, page);
      return {
        items: response.data.map(normalizeGender),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'countries': {
      const response = await client.listCountries(limit, page);
      return {
        items: response.data.map(normalizeCountry),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'contactFieldTypes': {
      const response = await client.listContactFieldTypes({ limit, page });
      return {
        items: response.data.map(normalizeContactFieldType),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'activityTypes': {
      const response = await client.listActivityTypes({ limit, page });
      return {
        items: response.data.map(normalizeActivityType),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'relationshipTypes': {
      const response = await client.listRelationshipTypes({ limit, page });
      return {
        items: response.data.map(normalizeRelationshipType),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'currencies': {
      const response = await client.listCurrencies({ limit, page });
      return {
        items: response.data.map(normalizeCurrency),
        meta: normalizeMeta(response.meta)
      };
    }

    case 'occupations': {
      const response = await client.listOccupations({ limit, page });
      return {
        items: response.data.map(normalizeOccupation),
        meta: normalizeMeta(response.meta)
      };
    }

    default:
      throw new Error(`Unsupported resource: ${resource satisfies never}`);
  }
}

function filterByQuery(resource: MetadataResource, items: unknown[], query: string) {
  switch (resource) {
    case 'genders':
      return (items as ReturnType<typeof normalizeGender>[]).filter((gender) =>
        gender.name.toLowerCase().includes(query)
      );

    case 'countries':
      return (items as ReturnType<typeof normalizeCountry>[]).filter((country) =>
        country.name.toLowerCase().includes(query) || country.iso?.toLowerCase().includes(query)
      );

    case 'contactFieldTypes':
      return (items as ReturnType<typeof normalizeContactFieldType>[]).filter((type) =>
        type.name.toLowerCase().includes(query) || type.kind?.toLowerCase().includes(query)
      );

    case 'activityTypes':
      return (items as ReturnType<typeof normalizeActivityType>[]).filter((activityType) =>
        activityType.name.toLowerCase().includes(query) ||
        activityType.category?.name?.toLowerCase().includes(query)
      );

    case 'relationshipTypes':
      return (items as ReturnType<typeof normalizeRelationshipType>[]).filter((relationshipType) =>
        relationshipType.name.toLowerCase().includes(query) ||
        relationshipType.reverseName.toLowerCase().includes(query)
      );

    case 'currencies':
      return (items as ReturnType<typeof normalizeCurrency>[]).filter((currency) =>
        currency.iso.toLowerCase().includes(query) || currency.name.toLowerCase().includes(query)
      );

    case 'occupations':
      return (items as ReturnType<typeof normalizeOccupation>[]).filter((occupation) =>
        occupation.title.toLowerCase().includes(query) ||
        (occupation.company?.name?.toLowerCase().includes(query) ?? false)
      );

    default:
      return items;
  }
}

const resourceLabels: Record<MetadataResource, string> = {
  genders: 'gender',
  countries: 'country',
  contactFieldTypes: 'contact field type',
  activityTypes: 'activity type',
  relationshipTypes: 'relationship type',
  currencies: 'currency',
  occupations: 'occupation'
};

function buildSummary(
  label: string,
  count: number,
  query: string | undefined,
  currentPage: number,
  lastPage: number
): string {
  const plural = count === 1 ? label : `${label}s`;

  if (count === 0) {
    return query
      ? `No ${label}s matched "${query}".`
      : `No ${label}s found on page ${currentPage}.`;
  }

  const base = `Found ${count} ${plural}${query ? ` matching "${query}"` : ''}.`;
  return `${base} Showing page ${currentPage} of ${lastPage}.`;
}

function normalizeMeta(meta: { current_page: number; last_page: number; per_page: number; total: number }) {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total
  };
}
