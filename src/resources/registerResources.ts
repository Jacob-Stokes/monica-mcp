import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from 'pino';
import type { MonicaClient } from '../client/MonicaClient.js';
import { normalizeContactDetail, normalizeNote } from '../utils/formatters.js';

interface RegisterResourcesOptions {
  server: McpServer;
  client: MonicaClient;
  logger: Logger;
}

export function registerResources({ server, client, logger }: RegisterResourcesOptions): void {
  const contactTemplate = new ResourceTemplate('monica-contact://{contactId}', {
    list: async () => ({ resources: [] }),
    complete: {
      contactId: async (value) => {
        if (!value || value.length < 2) {
          return [];
        }

        try {
          const search = await client.searchContacts({ query: value, limit: 5 });
          return search.data.map((contact) => String(contact.id));
        } catch (error) {
          logger.warn({ err: error }, 'Failed to complete Monica contactId values');
          return [];
        }
      }
    }
  });

  server.registerResource(
    'monica-contact',
    contactTemplate,
    {
      title: 'Monica contact profile',
      description: 'Fetch structured profile data for a Monica contact.'
    },
    async (uri, vars) => {
      const contactIdParam = Array.isArray(vars.contactId) ? vars.contactId[0] : vars.contactId;
      const contactId = Number.parseInt(contactIdParam ?? '', 10);
      if (Number.isNaN(contactId)) {
        throw new Error('contactId must be a numeric Monica contact identifier.');
      }

      const result = await client.getContact(contactId, true);
      const contact = normalizeContactDetail(result.data);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ contact }, null, 2)
          }
        ]
      };
    }
  );

  const notesTemplate = new ResourceTemplate('monica-contact-notes://{contactId}', {
    list: async () => ({ resources: [] }),
    complete: {
      contactId: async (value) => {
        if (!value || value.length < 2) {
          return [];
        }

        try {
          const search = await client.searchContacts({ query: value, limit: 5 });
          return search.data.map((contact) => String(contact.id));
        } catch (error) {
          logger.warn({ err: error }, 'Failed to complete Monica contactId values');
          return [];
        }
      }
    }
  });

  server.registerResource(
    'monica-contact-notes',
    notesTemplate,
    {
      title: 'Monica contact notes',
      description: 'List the latest notes recorded for a specific contact.'
    },
    async (uri, vars) => {
      const contactIdParam = Array.isArray(vars.contactId) ? vars.contactId[0] : vars.contactId;
      const contactId = Number.parseInt(contactIdParam ?? '', 10);
      if (Number.isNaN(contactId)) {
        throw new Error('contactId must be a numeric Monica contact identifier.');
      }

      const notes = await client.fetchContactNotes(contactId, 20, 1);
      const normalized = notes.data.map(normalizeNote);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                contactId,
                notes: normalized,
                pagination: {
                  currentPage: notes.meta.current_page,
                  lastPage: notes.meta.last_page,
                  perPage: notes.meta.per_page,
                  total: notes.meta.total
                }
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
