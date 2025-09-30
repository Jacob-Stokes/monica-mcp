import { z } from 'zod';
import type {
  CreateConversationPayload,
  UpdateConversationPayload,
  CreateConversationMessagePayload,
  UpdateConversationMessagePayload,
  CreateCallPayload,
  UpdateCallPayload
} from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeConversation, normalizeCall } from '../../utils/formatters.js';
import { resolveContactFieldTypeId } from '../../utils/resolvers.js';

const conversationPayloadSchema = z.object({
  happenedAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'happenedAt must use YYYY-MM-DD format.')
    .optional(),
  contactFieldTypeId: z.number().int().positive().optional(),
  contactFieldTypeName: z.string().min(1).max(255).optional(),
  contactId: z.number().int().positive().optional()
});

type ConversationPayloadForm = z.infer<typeof conversationPayloadSchema>;

const conversationMessagePayloadSchema = z.object({
  writtenAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'writtenAt must use YYYY-MM-DD format.')
    .optional(),
  writtenByMe: z.boolean().optional(),
  content: z.string().min(1).max(1_000_000).optional(),
  contactId: z.number().int().positive().optional()
});

type ConversationMessagePayloadForm = z.infer<typeof conversationMessagePayloadSchema>;

const callPayloadSchema = z.object({
  calledAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'calledAt must use YYYY-MM-DD format.')
    .optional(),
  contactId: z.number().int().positive().optional(),
  content: z.string().max(1_000_000).optional().nullable()
});

type CallPayloadForm = z.infer<typeof callPayloadSchema>;

export function registerCommunicationTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_conversation',
    {
      title: 'Manage Monica conversations',
      description:
        'List, inspect, create, update, delete, or manage messages inside Monica conversations. Provide either contactFieldTypeId or contactFieldTypeName for the channel.',
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'addMessage',
          'updateMessage',
          'deleteMessage'
        ]),
        conversationId: z.number().int().positive().optional(),
        messageId: z.number().int().positive().optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: conversationPayloadSchema.optional(),
        messagePayload: conversationMessagePayloadSchema.optional()
      }
    },
    async ({ action, conversationId, messageId, contactId, limit, page, payload, messagePayload }) => {
      switch (action) {
        case 'list': {
          const response = await client.listConversations({ contactId, limit, page });
          const conversations = response.data.map(normalizeConversation);
          const scope = contactId ? `contact ${contactId}` : 'your account';
          const textSummary = conversations.length
            ? `Found ${conversations.length} conversation${conversations.length === 1 ? '' : 's'} for ${scope}.`
            : `No conversations found for ${scope}.`;

          return {
            content: [
              { type: 'text' as const, text: textSummary }
            ],
            structuredContent: {
              action,
              contactId,
              conversations,
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
          if (!conversationId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId when retrieving a conversation.' }
              ]
            };
          }

          const response = await client.getConversation(conversationId);
          const conversation = normalizeConversation(response.data);
          const channel = conversation.channel.name;
          const contactName = conversation.contact?.name || `Contact ${conversation.contactId}`;

          return {
            content: [
              {
                type: 'text' as const,
                text: `Conversation ${conversationId} via ${channel} with ${contactName}. ${conversation.messages.length} message(s).`
              }
            ],
            structuredContent: {
              action,
              conversationId,
              conversation
            }
          };
        }

        case 'create': {
          if (!payload) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Provide happenedAt, contactFieldTypeId or contactFieldTypeName, and contactId when creating a conversation.'
                }
              ]
            };
          }

          let input: CreateConversationPayload;
          try {
            input = await toConversationCreatePayload(client, payload);
          } catch (error) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: (error as Error).message }
              ]
            };
          }

          const response = await client.createConversation(input);
          const conversation = normalizeConversation(response.data);
          logger.info({ conversationId: conversation.id, contactId: conversation.contactId }, 'Created Monica conversation');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Created conversation ${conversation.id} for contact ${conversation.contactId}.`
              }
            ],
            structuredContent: {
              action,
              conversation
            }
          };
        }

        case 'update': {
          if (!conversationId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId when updating a conversation.' }
              ]
            };
          }

          if (!payload) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide happenedAt and channel info when updating a conversation.' }
              ]
            };
          }

          let input: UpdateConversationPayload;
          try {
            input = toConversationUpdatePayload(payload);
          } catch (error) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: (error as Error).message }
              ]
            };
          }

          const response = await client.updateConversation(conversationId, input);
          const conversation = normalizeConversation(response.data);
          logger.info({ conversationId }, 'Updated Monica conversation');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated conversation ${conversationId}.`
              }
            ],
            structuredContent: {
              action,
              conversationId,
              conversation
            }
          };
        }

        case 'delete': {
          if (!conversationId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId when deleting a conversation.' }
              ]
            };
          }

          const result = await client.deleteConversation(conversationId);
          logger.info({ conversationId }, 'Deleted Monica conversation');

          return {
            content: [
              { type: 'text' as const, text: `Deleted conversation ID ${conversationId}.` }
            ],
            structuredContent: {
              action,
              conversationId,
              result
            }
          };
        }

        case 'addMessage': {
          if (!conversationId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId when adding a message.' }
              ]
            };
          }

          if (!messagePayload) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide message details when adding to a conversation.' }
              ]
            };
          }

          let input: CreateConversationMessagePayload;
          try {
            input = toConversationMessageCreatePayload(messagePayload);
          } catch (error) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: (error as Error).message }
              ]
            };
          }

          const response = await client.addConversationMessage(conversationId, input);
          const conversation = normalizeConversation(response.data);
          logger.info({ conversationId, contactId: input.contactId }, 'Added Monica conversation message');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Added message to conversation ${conversationId}.`
              }
            ],
            structuredContent: {
              action,
              conversationId,
              conversation
            }
          };
        }

        case 'updateMessage': {
          if (!conversationId || !messageId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId and messageId when updating a message.' }
              ]
            };
          }

          if (!messagePayload) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide message details when updating a conversation message.' }
              ]
            };
          }

          let input: UpdateConversationMessagePayload;
          try {
            input = toConversationMessageUpdatePayload(messagePayload);
          } catch (error) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: (error as Error).message }
              ]
            };
          }

          const response = await client.updateConversationMessage(conversationId, messageId, input);
          const conversation = normalizeConversation(response.data);
          logger.info({ conversationId, messageId }, 'Updated Monica conversation message');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated message ${messageId} in conversation ${conversationId}.`
              }
            ],
            structuredContent: {
              action,
              conversationId,
              messageId,
              conversation
            }
          };
        }

        case 'deleteMessage': {
          if (!conversationId || !messageId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide conversationId and messageId when deleting a conversation message.' }
              ]
            };
          }

          const result = await client.deleteConversationMessage(conversationId, messageId);
          logger.info({ conversationId, messageId }, 'Deleted Monica conversation message');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Deleted message ${messageId} from conversation ${conversationId}.`
              }
            ],
            structuredContent: {
              action,
              conversationId,
              messageId,
              result
            }
          };
        }

        default:
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: `Unsupported action: ${action}.` }
            ]
          };
      }
    }
  );

  server.registerTool(
    'monica_manage_call',
    {
      title: 'Log Monica calls',
      description:
        'List, inspect, create, update, or delete logged phone calls. Use this to capture quick notes about conversations with contacts.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        callId: z.number().int().positive().optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        page: z.number().int().min(1).optional(),
        payload: callPayloadSchema.optional()
      }
    },
    async ({ action, callId, contactId, limit, page, payload }) => {
      switch (action) {
        case 'list': {
          const response = await client.listCalls({ contactId, limit, page });
          const calls = response.data.map(normalizeCall);
          const scope = contactId ? `contact ${contactId}` : 'your account';
          const textSummary = calls.length
            ? `Found ${calls.length} call${calls.length === 1 ? '' : 's'} for ${scope}.`
            : `No calls found for ${scope}.`;

          return {
            content: [
              { type: 'text' as const, text: textSummary }
            ],
            structuredContent: {
              action,
              contactId,
              calls,
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
          if (!callId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide callId when retrieving a call.' }
              ]
            };
          }

          const response = await client.getCall(callId);
          const call = normalizeCall(response.data);
          const contactName = call.contact?.name || `Contact ${call.contactId}`;

          return {
            content: [
              {
                type: 'text' as const,
                text: `Call ${call.id} with ${contactName} on ${call.calledAt ?? 'unknown date'}.`
              }
            ],
            structuredContent: {
              action,
              callId,
              call
            }
          };
        }

        case 'create': {
          if (!payload) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide calledAt, contactId, and optional content when logging a call.' }
              ]
            };
          }

          let input: CreateCallPayload;
          try {
            input = toCallCreatePayload(payload);
          } catch (error) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: (error as Error).message }
              ]
            };
          }

          const response = await client.createCall(input);
          const call = normalizeCall(response.data);
          logger.info({ callId: call.id, contactId: call.contactId }, 'Logged Monica call');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Logged call ${call.id} for contact ${call.contactId}.`
              }
            ],
            structuredContent: {
              action,
              call
            }
          };
        }

        case 'update': {
          if (!callId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide callId when updating a call.' }
              ]
            };
          }

          if (!payload) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide call details when updating a call.' }
              ]
            };
          }

          const patch = toCallUpdatePayload(payload);
          if (patch.calledAt === undefined && patch.contactId === undefined && patch.content === undefined) {
            return {
              isError: true as const,
              content: [
                {
                  type: 'text' as const,
                  text: 'Include at least one field (calledAt, contactId, or content) to update the call.'
                }
              ]
            };
          }

          const response = await client.updateCall(callId, patch);
          const call = normalizeCall(response.data);
          logger.info({ callId, contactId: call.contactId }, 'Updated Monica call');

          return {
            content: [
              {
                type: 'text' as const,
                text: `Updated call ${callId}.`
              }
            ],
            structuredContent: {
              action,
              callId,
              call
            }
          };
        }

        case 'delete': {
          if (!callId) {
            return {
              isError: true as const,
              content: [
                { type: 'text' as const, text: 'Provide callId when deleting a call.' }
              ]
            };
          }

          const result = await client.deleteCall(callId);
          logger.info({ callId }, 'Deleted Monica call');

          return {
            content: [
              { type: 'text' as const, text: `Deleted call ID ${callId}.` }
            ],
            structuredContent: {
              action,
              callId,
              result
            }
          };
        }

        default:
          return {
            isError: true as const,
            content: [
              { type: 'text' as const, text: `Unsupported action: ${action}.` }
            ]
          };
      }
    }
  );
}

async function toConversationCreatePayload(
  client: ToolRegistrationContext['client'],
  payload: ConversationPayloadForm
): Promise<CreateConversationPayload> {
  if (!payload.happenedAt) {
    throw new Error('Provide happenedAt when creating a conversation.');
  }

  if (typeof payload.contactId !== 'number') {
    throw new Error('Provide contactId when creating a conversation.');
  }

  const contactFieldTypeId = await resolveContactFieldTypeId(client, {
    contactFieldTypeId: payload.contactFieldTypeId,
    contactFieldTypeName: payload.contactFieldTypeName
  });

  return {
    happenedAt: payload.happenedAt,
    contactFieldTypeId,
    contactId: payload.contactId
  };
}

function toConversationUpdatePayload(payload: ConversationPayloadForm): UpdateConversationPayload {
  if (!payload.happenedAt) {
    throw new Error('Provide happenedAt when updating a conversation.');
  }

  return {
    happenedAt: payload.happenedAt
  };
}

function toConversationMessageCreatePayload(
  payload: ConversationMessagePayloadForm
): CreateConversationMessagePayload {
  if (
    typeof payload.contactId !== 'number' ||
    !payload.writtenAt ||
    typeof payload.writtenByMe !== 'boolean' ||
    !payload.content
  ) {
    throw new Error('Provide contactId, writtenAt, writtenByMe, and content when adding a conversation message.');
  }

  return {
    contactId: payload.contactId,
    writtenAt: payload.writtenAt,
    writtenByMe: payload.writtenByMe,
    content: payload.content
  };
}

function toConversationMessageUpdatePayload(
  payload: ConversationMessagePayloadForm
): UpdateConversationMessagePayload {
  if (
    typeof payload.contactId !== 'number' ||
    !payload.writtenAt ||
    typeof payload.writtenByMe !== 'boolean' ||
    !payload.content
  ) {
    throw new Error('Provide contactId, writtenAt, writtenByMe, and content when updating a conversation message.');
  }

  return {
    contactId: payload.contactId,
    writtenAt: payload.writtenAt,
    writtenByMe: payload.writtenByMe,
    content: payload.content
  };
}

function toCallCreatePayload(payload: CallPayloadForm): CreateCallPayload {
  if (!payload.calledAt || typeof payload.contactId !== 'number') {
    throw new Error('Provide calledAt and contactId when creating a call.');
  }

  return {
    contactId: payload.contactId,
    calledAt: payload.calledAt,
    content: payload.content ?? null
  };
}

function toCallUpdatePayload(payload: CallPayloadForm): UpdateCallPayload {
  const result: UpdateCallPayload = {};

  if (payload.contactId !== undefined) {
    result.contactId = payload.contactId;
  }

  if (payload.calledAt !== undefined) {
    result.calledAt = payload.calledAt;
  }

  if (payload.content !== undefined) {
    result.content = payload.content ?? null;
  }

  return result;
}
