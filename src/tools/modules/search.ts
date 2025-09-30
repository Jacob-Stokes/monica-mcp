import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeContactSummary } from '../../utils/formatters.js';

export function registerSearchTools({ server, client }: ToolRegistrationContext): void {
  server.registerTool(
    'monica_search_contacts',
    {
      title: 'Search Monica contacts',
      description:
        'Search Monica CRM contacts by name, nickname, or email. Returns contact IDs and basic info. Use the returned ID with other tools to get details or make updates.',
      inputSchema: {
        query: z.string().min(2, 'Provide at least 2 characters to search.'),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        includePartial: z.boolean().optional()
      }
    },
    async ({ query, limit, page, includePartial }) => {
      const results = await client.searchContacts({ query, limit, page, includePartial });
      const contacts = results.data.map(normalizeContactSummary);

      const text = contacts.length
        ? `Found ${contacts.length} contact(s) matching "${query}":\n\n${contacts
            .map((contact) => {
              const emails = contact.emails.length ? ` (${contact.emails.join(', ')})` : '';
              const phones = contact.phones.length ? ` [${contact.phones.join(', ')}]` : '';
              const nickname = contact.nickname ? ` "${contact.nickname}"` : '';
              return `• ID: ${contact.id} - ${contact.name}${nickname}${emails}${phones}`;
            })
            .join('\n')}`
        : `No Monica contacts matched "${query}".`;

      return {
        content: [
          {
            type: 'text' as const,
            text
          }
        ],
        structuredContent: {
          contacts,
          pagination: {
            currentPage: results.meta.current_page,
            lastPage: results.meta.last_page,
            perPage: results.meta.per_page,
            total: results.meta.total
          }
        }
      };
    }
  );
}
