import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeContactDetail, normalizeTag } from '../../utils/formatters.js';
import {
  buildGetResponse,
  buildMutationResponse,
  buildErrorResponse,
  generateUpdateSummary
} from '../../utils/responseHelpers.js';

const contactTagsInputShape = {
  action: z.enum(['list', 'append', 'remove']),
  contactId: z.number().int().positive(),
  tagNames: z.array(z.string().min(1)).optional(),
  tagIds: z.array(z.number().int().positive()).optional()
} as const;

const contactTagsInputSchema = z.object(contactTagsInputShape).superRefine((data, ctx) => {
  if (data.action === 'append' && (!data.tagNames || data.tagNames.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tagNames'],
      message: 'Provide at least one tag name when appending tags to a contact.'
    });
  }

  if (
    data.action === 'remove' &&
    (!data.tagIds || data.tagIds.length === 0) &&
    (!data.tagNames || data.tagNames.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tagIds'],
      message: 'Provide tagIds or tagNames when removing tags from a contact.'
    });
  }
});

type ContactTagsInput = z.infer<typeof contactTagsInputSchema>;

export function registerContactTagTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_contact_tags',
    {
      title: 'Manage contact tag assignments',
      description:
        'List, append, or remove tags on a specific contact. Use tagNames to add new/existing tags, or tagIds/tagNames to remove associations.',
      inputSchema: contactTagsInputShape
    },
    async (rawInput) => {
      const input = contactTagsInputSchema.parse(rawInput);
      const { contactId } = input;

      switch (input.action) {
        case 'list': {
          const tags = await client.listContactTags(contactId);
          const summary = tags.length
            ? `Contact ${contactId} has ${tags.length} tag(s).`
            : `Contact ${contactId} has no tags.`;

          return buildGetResponse({
            item: tags.map(normalizeTag),
            summaryText: summary,
            structuredData: {
              action: input.action,
              contactId,
              tags: tags.map(normalizeTag)
            }
          });
        }

        case 'append': {
          const tagNames = input.tagNames!;
          const response = await client.setContactTags(contactId, tagNames);
          const contact = normalizeContactDetail(response.data);
          logger.info({ contactId, tagsAdded: tagNames }, 'Appended tags to Monica contact');

          return buildMutationResponse({
            action: 'update',
            summaryText: `Added ${tagNames.length} tag(s) to contact ${contactId}.`,
            structuredData: {
              contactId,
              addedTags: tagNames,
              contact
            }
          });
        }

        case 'remove': {
          let tagIds = input.tagIds ?? [];
          const tagNames = input.tagNames ?? [];

          if (tagNames.length) {
            const currentTags = await client.listContactTags(contactId);
            const lookup = new Map(currentTags.map((tag) => [tag.name.toLowerCase(), tag.id]));

            const missing: string[] = [];
            for (const name of tagNames) {
              const id = lookup.get(name.toLowerCase());
              if (id) {
                tagIds.push(id);
              } else {
                missing.push(name);
              }
            }

            if (missing.length) {
              return buildErrorResponse(
                `The following tag name(s) are not associated with contact ${contactId}: ${missing.join(', ')}`
              );
            }
          }

          const uniqueTagIds = Array.from(new Set(tagIds));
          const response = await client.unsetContactTags(contactId, uniqueTagIds);
          const contact = normalizeContactDetail(response.data);
          logger.info({ contactId, tagsRemoved: uniqueTagIds }, 'Removed tags from Monica contact');

          return buildMutationResponse({
            action: 'update',
            summaryText: generateUpdateSummary({
              itemName: 'contact',
              itemId: contactId,
              contextInfo: `after removing ${uniqueTagIds.length} tag(s)`
            }),
            structuredData: {
              contactId,
              removedTagIds: uniqueTagIds,
              contact
            }
          });
        }

        default:
          return buildErrorResponse(`Unsupported action: ${String((input as ContactTagsInput).action)}`);
      }
    }
  );
}
