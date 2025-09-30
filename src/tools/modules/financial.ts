import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import {
  normalizeDebt,
  normalizeGift
} from '../../utils/formatters.js';
import type {
  CreateGiftPayload,
  UpdateGiftPayload,
  CreateDebtPayload,
  UpdateDebtPayload
} from '../../client/MonicaClient.js';

const giftPayloadSchema = z.object({
  contactId: z.number().int().positive(),
  receivedOn: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'receivedOn must use YYYY-MM-DD format.'),
  title: z.string().min(1).max(255),
  description: z.string().max(1_000_000).optional().nullable(),
  wasGivenByMe: z.boolean().optional(),
  amount: z.number().optional(),
  currencyId: z.number().int().positive().optional()
});

type GiftPayloadForm = z.infer<typeof giftPayloadSchema>;

const debtPayloadSchema = z.object({
  contactId: z.number().int().positive(),
  description: z.string().max(1_000_000).optional().nullable(),
  amount: z.number().positive(),
  currencyId: z.number().int().positive().optional(),
  happenedAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'happenedAt must use YYYY-MM-DD format.'),
  isSettled: z.boolean().optional(),
  settledAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'settledAt must use YYYY-MM-DD format.')
    .optional()
    .nullable()
});

type DebtPayloadForm = z.infer<typeof debtPayloadSchema>;

const financialInputShape = {
  recordType: z.enum(['gift', 'debt']),
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  recordId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
  giftPayload: giftPayloadSchema.optional(),
  debtPayload: debtPayloadSchema.optional()
} as const;

const financialInputSchema = z.object(financialInputShape);

type FinancialInput = z.infer<typeof financialInputSchema>;

type GiftInput = FinancialInput & { recordType: 'gift' };
type DebtInput = FinancialInput & { recordType: 'debt' };

export function registerFinancialTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_financial_record',
    {
      title: 'Manage Monica gifts and debts',
      description:
        'List, inspect, create, update, or delete gifts and debts. Use recordType="gift" for presents, recordType="debt" for money owed.',
      inputSchema: financialInputShape
    },
    async (rawInput) => {
      const input = financialInputSchema.parse(rawInput);

      if (input.recordType === 'gift') {
        return handleGift({ input: input as GiftInput, client, logger });
      }

      return handleDebt({ input: input as DebtInput, client, logger });
    }
  );
}

async function handleGift({
  input,
  client,
  logger
}: {
  input: GiftInput;
  client: ToolRegistrationContext['client'];
  logger: ToolRegistrationContext['logger'];
}) {
  const { action } = input;

  switch (action) {
    case 'list': {
      const response = await client.listGifts({
        contactId: input.contactId,
        limit: input.limit,
        page: input.page
      });
      const gifts = response.data.map(normalizeGift);
      const scope = input.contactId ? `contact ${input.contactId}` : 'your account';
      const summary = gifts.length
        ? `Found ${gifts.length} gift${gifts.length === 1 ? '' : 's'} for ${scope}.`
        : `No gifts found for ${scope}.`;

      return {
        content: [
          {
            type: 'text' as const,
            text: summary
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          contactId: input.contactId,
          gifts,
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
      if (input.recordId == null) {
        return missingIdError('gift');
      }

      const response = await client.getGift(input.recordId);
      const gift = normalizeGift(response.data);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Gift ${gift.title} (ID ${gift.id}).`
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          gift
        }
      };
    }

    case 'create': {
      if (!input.giftPayload) {
        return missingPayloadError('gift');
      }

      const response = await client.createGift(toGiftCreatePayload(input.giftPayload));
      const gift = normalizeGift(response.data);
      logger.info({ giftId: gift.id, contactId: gift.contact.id }, 'Created Monica gift');

      return {
        content: [
          { type: 'text' as const, text: `Created gift ${gift.title} (ID ${gift.id}).` }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          gift
        }
      };
    }

    case 'update': {
      if (input.recordId == null) {
        return missingIdError('gift');
      }
      if (!input.giftPayload) {
        return missingPayloadError('gift');
      }

      const response = await client.updateGift(input.recordId, toGiftUpdatePayload(input.giftPayload));
      const gift = normalizeGift(response.data);
      logger.info({ giftId: gift.id }, 'Updated Monica gift');

      return {
        content: [
          { type: 'text' as const, text: `Updated gift ${gift.title} (ID ${gift.id}).` }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          gift
        }
      };
    }

    case 'delete': {
      if (input.recordId == null) {
        return missingIdError('gift');
      }

      const result = await client.deleteGift(input.recordId);
      logger.info({ giftId: input.recordId }, 'Deleted Monica gift');

      return {
        content: [
          { type: 'text' as const, text: `Deleted gift ID ${input.recordId}.` }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          result
        }
      };
    }

    default:
      return unsupportedAction(action);
  }
}

async function handleDebt({
  input,
  client,
  logger
}: {
  input: DebtInput;
  client: ToolRegistrationContext['client'];
  logger: ToolRegistrationContext['logger'];
}) {
  const { action } = input;

  switch (action) {
    case 'list': {
      const response = await client.listDebts({
        contactId: input.contactId,
        limit: input.limit,
        page: input.page
      });
      const debts = response.data.map(normalizeDebt);
      const scope = input.contactId ? `contact ${input.contactId}` : 'your account';
      const summary = debts.length
        ? `Found ${debts.length} debt${debts.length === 1 ? '' : 's'} for ${scope}.`
        : `No debts found for ${scope}.`;

      return {
        content: [
          {
            type: 'text' as const,
            text: summary
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          contactId: input.contactId,
          debts,
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
      if (input.recordId == null) {
        return missingIdError('debt');
      }

      const response = await client.getDebt(input.recordId);
      const debt = normalizeDebt(response.data);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Debt ID ${debt.id} (${debt.amount} ${debt.currency?.iso ?? ''}).`
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          debt
        }
      };
    }

    case 'create': {
      if (!input.debtPayload) {
        return missingPayloadError('debt');
      }

      const response = await client.createDebt(toDebtCreatePayload(input.debtPayload));
      const debt = normalizeDebt(response.data);
      logger.info({ debtId: debt.id, contactId: debt.contact.id }, 'Created Monica debt');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created debt ID ${debt.id} (${debt.amount} ${debt.currency?.iso ?? ''}).`
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          debt
        }
      };
    }

    case 'update': {
      if (input.recordId == null) {
        return missingIdError('debt');
      }
      if (!input.debtPayload) {
        return missingPayloadError('debt');
      }

      const response = await client.updateDebt(input.recordId, toDebtUpdatePayload(input.debtPayload));
      const debt = normalizeDebt(response.data);
      logger.info({ debtId: debt.id }, 'Updated Monica debt');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated debt ID ${debt.id} (${debt.amount} ${debt.currency?.iso ?? ''}).`
          }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          debt
        }
      };
    }

    case 'delete': {
      if (input.recordId == null) {
        return missingIdError('debt');
      }

      const result = await client.deleteDebt(input.recordId);
      logger.info({ debtId: input.recordId }, 'Deleted Monica debt');

      return {
        content: [
          { type: 'text' as const, text: `Deleted debt ID ${input.recordId}.` }
        ],
        structuredContent: {
          recordType: input.recordType,
          action,
          recordId: input.recordId,
          result
        }
      };
    }

    default:
      return unsupportedAction(action);
  }
}

function toGiftCreatePayload(payload: GiftPayloadForm): CreateGiftPayload {
  return {
    contactId: payload.contactId,
    receivedOn: payload.receivedOn,
    title: payload.title,
    description: payload.description ?? null,
    wasGivenByMe: payload.wasGivenByMe ?? false,
    amount: payload.amount ?? null,
    currencyId: payload.currencyId ?? null
  };
}

function toGiftUpdatePayload(payload: GiftPayloadForm): UpdateGiftPayload {
  const result: UpdateGiftPayload = {};

  if (payload.contactId !== undefined) {
    result.contactId = payload.contactId;
  }
  if (payload.receivedOn !== undefined) {
    result.receivedOn = payload.receivedOn;
  }
  if (payload.title !== undefined) {
    result.title = payload.title;
  }
  if (payload.description !== undefined) {
    result.description = payload.description ?? null;
  }
  if (payload.wasGivenByMe !== undefined) {
    result.wasGivenByMe = payload.wasGivenByMe;
  }
  if (payload.amount !== undefined) {
    result.amount = payload.amount ?? null;
  }
  if (payload.currencyId !== undefined) {
    result.currencyId = payload.currencyId ?? null;
  }

  return result;
}

function toDebtCreatePayload(payload: DebtPayloadForm): CreateDebtPayload {
  return {
    contactId: payload.contactId,
    description: payload.description ?? null,
    amount: payload.amount,
    currencyId: payload.currencyId ?? null,
    happenedAt: payload.happenedAt,
    isSettled: payload.isSettled ?? false,
    settledAt: payload.settledAt ?? null
  };
}

function toDebtUpdatePayload(payload: DebtPayloadForm): UpdateDebtPayload {
  const result: UpdateDebtPayload = {};

  if (payload.contactId !== undefined) {
    result.contactId = payload.contactId;
  }
  if (payload.description !== undefined) {
    result.description = payload.description ?? null;
  }
  if (payload.amount !== undefined) {
    result.amount = payload.amount;
  }
  if (payload.currencyId !== undefined) {
    result.currencyId = payload.currencyId ?? null;
  }
  if (payload.happenedAt !== undefined) {
    result.happenedAt = payload.happenedAt;
  }
  if (payload.isSettled !== undefined) {
    result.isSettled = payload.isSettled;
  }
  if (payload.settledAt !== undefined) {
    result.settledAt = payload.settledAt ?? null;
  }

  return result;
}

function missingIdError(recordType: 'gift' | 'debt') {
  return {
    isError: true as const,
    content: [
      { type: 'text' as const, text: `Provide ${recordType} recordId for this action.` }
    ]
  };
}

function missingPayloadError(recordType: 'gift' | 'debt') {
  return {
    isError: true as const,
    content: [
      { type: 'text' as const, text: `Provide ${recordType} details for this action.` }
    ]
  };
}

function unsupportedAction(action: string) {
  return {
    isError: true as const,
    content: [
      { type: 'text' as const, text: `Unsupported action: ${action}.` }
    ]
  };
}
