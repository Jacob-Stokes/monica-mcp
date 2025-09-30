import { z } from 'zod';
import type { CreateNotePayload, UpdateNotePayload } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeNote } from '../../utils/formatters.js';

const notePayloadSchema = z.object({
  body: z.string().max(1_000_000).optional(),
  contactId: z.number().int().positive().optional(),
  isFavorited: z.boolean().optional()
});

type NotePayloadForm = z.infer<typeof notePayloadSchema>;

export function registerNoteTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_note',
    {
      title: 'Manage Monica notes',
      description:
        'List, inspect, create, update, or delete notes attached to a contact. Use this to capture or revise journal snippets.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        noteId: z.number().int().positive().optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: notePayloadSchema.optional()
      }
    },
    async ({ action, noteId, contactId, limit, page, payload }) => {
      if (action === 'list') {
        if (!contactId) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide contactId when listing notes.' }
            ]
          };
        }

        const response = await client.fetchContactNotes(contactId, limit, page);
        const notes = response.data.map(normalizeNote);

        const summary = notes.length
          ? `Fetched ${notes.length} note${notes.length === 1 ? '' : 's'} for contact ${contactId}.`
          : `No notes found for contact ${contactId}.`;

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
            notes,
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
        if (!noteId) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide noteId when retrieving a note.' }
            ]
          };
        }

        const response = await client.getNote(noteId);
        const note = normalizeNote(response.data);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Note ${note.id} for contact ${note.contact.name}.`
            }
          ],
          structuredContent: {
            action,
            note
          }
        };
      }

      if (action === 'create') {
        if (!payload || typeof payload.contactId !== 'number' || !payload.body) {
          return {
            isError: true as const,
            content: [
              {
                type: 'text' as const,
                text: 'Provide contactId and body when creating a note.'
              }
            ]
          };
        }

        const result = await client.createNote(toNoteCreatePayload(payload));
        const note = normalizeNote(result.data);
        logger.info({ noteId: note.id }, 'Created Monica note');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Created note ${note.id} for contact ${note.contact.name}.`
            }
          ],
          structuredContent: {
            action,
            note
          }
        };
      }

      if (action === 'update') {
        if (!noteId) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide noteId when updating a note.' }
            ]
          };
        }

        if (!payload) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide note details when updating a note.' }
            ]
          };
        }

        const result = await client.updateNote(noteId, toNoteUpdatePayload(payload));
        const note = normalizeNote(result.data);
        logger.info({ noteId }, 'Updated Monica note');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Updated note ${note.id} for contact ${note.contact.name}.`
            }
          ],
          structuredContent: {
            action,
            noteId,
            note
          }
        };
      }

      if (action === 'delete') {
        if (!noteId) {
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: 'Provide noteId when deleting a note.' }
            ]
          };
        }

        await client.deleteNote(noteId);
        logger.info({ noteId }, 'Deleted Monica note');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Deleted note ID ${noteId}.`
            }
          ],
          structuredContent: {
            action,
            noteId,
            deleted: true
          }
        };
      }

      return {
        isError: true as const,
        content: [
          {
            type: 'text' as const,
            text: `Unsupported action: ${action}.`
          }
        ]
      };
    }
  );
}

function toNoteCreatePayload(payload: NotePayloadForm): CreateNotePayload {
  return {
    contactId: payload.contactId!,
    body: payload.body!,
    isFavorited: payload.isFavorited
  };
}

function toNoteUpdatePayload(payload: NotePayloadForm): UpdateNotePayload {
  const { contactId, body, isFavorited } = payload;
  return {
    contactId,
    body,
    isFavorited
  };
}
