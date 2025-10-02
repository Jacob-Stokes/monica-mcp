import { z } from 'zod';
import type {
  CreateReminderPayload,
  CreateTaskPayload,
  UpdateReminderPayload,
  UpdateTaskPayload
} from '../../client/MonicaClient.js';
import { MonicaApiError } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeReminder, normalizeTask } from '../../utils/formatters.js';
import { buildErrorResponse } from '../../utils/responseHelpers.js';

const taskPayloadSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1_000_000).optional().nullable(),
  status: z.enum(['open', 'completed']).optional(),
  completedAt: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'completedAt must use YYYY-MM-DD format.')
    .optional()
    .nullable(),
  contactId: z.number().int().positive().optional()
});

type TaskPayloadForm = z.infer<typeof taskPayloadSchema>;

const reminderPayloadSchema = z.object({
  title: z.string().min(1).max(100_000).optional(),
  description: z.string().max(1_000_000).optional().nullable(),
  nextExpectedDate: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'nextExpectedDate must use YYYY-MM-DD format.')
    .optional(),
  frequencyType: z.enum(['one_time', 'day', 'week', 'month', 'year']).optional(),
  frequencyNumber: z.number().int().min(1).optional(),
  contactId: z.number().int().positive().optional()
});

type ReminderPayloadForm = z.infer<typeof reminderPayloadSchema>;

const actionItemInputShape = {
  itemType: z.enum(['task', 'reminder']),
  action: z.enum(['list', 'get', 'create', 'update', 'delete']),
  taskId: z.number().int().positive().optional(),
  reminderId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  status: z.enum(['open', 'completed', 'all']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
  taskPayload: taskPayloadSchema.optional(),
  reminderPayload: reminderPayloadSchema.optional()
} as const;

const actionItemSchema = z.object(actionItemInputShape).superRefine((data, ctx) => {
  if (data.itemType === 'task') {
    switch (data.action) {
      case 'list':
        break;
      case 'get':
      case 'delete':
        if (typeof data.taskId !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide taskId for this action.' });
        }
        break;
      case 'create':
        if (!data.taskPayload) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide task details when creating a task.' });
        }
        break;
      case 'update':
        if (typeof data.taskId !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide taskId when updating a task.' });
        }
        if (!data.taskPayload) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide task details when updating a task.' });
        }
        break;
      default:
        break;
    }
  } else {
    switch (data.action) {
      case 'list':
        break;
      case 'get':
      case 'delete':
        if (typeof data.reminderId !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide reminderId for this action.' });
        }
        break;
      case 'create':
        if (!data.reminderPayload) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide reminder details when creating a reminder.' });
        }
        break;
      case 'update':
        if (typeof data.reminderId !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide reminderId when updating a reminder.' });
        }
        if (!data.reminderPayload) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide reminder details when updating a reminder.' });
        }
        break;
      default:
        break;
    }
  }
});

type ActionItemInput = z.infer<typeof actionItemSchema>;
type TaskActionInput = ActionItemInput & { itemType: 'task' };
type ReminderActionInput = ActionItemInput & { itemType: 'reminder' };

export function registerActionTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_task_reminder',
    {
      title: 'Manage Monica tasks and reminders',
      description:
        'List, inspect, create, update, or delete Monica tasks and reminders. Choose itemType="task" for to-dos or itemType="reminder" for stay-in-touch nudges.',
      inputSchema: actionItemInputShape
    },
    async (rawInput) => {
      const input = actionItemSchema.parse(rawInput);

      if (input.itemType === 'task') {
        return handleTaskAction({ input: input as TaskActionInput, client, logger });
      }

      return handleReminderAction({ input: input as ReminderActionInput, client, logger });
    }
  );
}

async function handleTaskAction({
  input,
  client,
  logger
}: {
  input: TaskActionInput;
  client: ToolRegistrationContext['client'];
  logger: ToolRegistrationContext['logger'];
}) {
  switch (input.action) {
    case 'list': {
      const response = await client.listTasks({
        contactId: input.contactId,
        status: input.status,
        limit: input.limit,
        page: input.page
      });
      const tasks = response.data.map(normalizeTask);
      const scope = input.contactId ? `contact ${input.contactId}` : 'your account';
      const summary = tasks.length
        ? `Fetched ${tasks.length} task${tasks.length === 1 ? '' : 's'} for ${scope}.`
        : `No tasks found for ${scope}.`;

      return {
        content: [
          {
            type: 'text' as const,
            text: summary
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          contactId: input.contactId,
          status: input.status,
          tasks,
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
      const response = await client.getTask(input.taskId!);
      const task = normalizeTask(response.data);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Task ${task.title} (ID ${task.id}).`
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          task
        }
      };
    }

    case 'create': {
      const payload = input.taskPayload!;
      const result = await client.createTask(toTaskCreatePayload(payload));
      const task = normalizeTask(result.data);
      logger.info({ taskId: task.id }, 'Created Monica task');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created task ${task.title || `#${task.id}`} (ID ${task.id}).`
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          task
        }
      };
    }

    case 'update': {
      const payload = input.taskPayload!;
      const result = await client.updateTask(input.taskId!, toTaskUpdatePayload(payload));
      const task = normalizeTask(result.data);
      logger.info({ taskId: input.taskId }, 'Updated Monica task');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated task ${task.title || `#${task.id}`} (ID ${task.id}).`
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          taskId: input.taskId,
          task
        }
      };
    }

    case 'delete': {
      const result = await client.deleteTask(input.taskId!);
      logger.info({ taskId: input.taskId }, 'Deleted Monica task');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted task ID ${input.taskId}.`
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          taskId: input.taskId,
          result
        }
      };
    }

    default:
      return unreachable(input.action as never);
  }
}

async function handleReminderAction({
  input,
  client,
  logger
}: {
  input: ReminderActionInput;
  client: ToolRegistrationContext['client'];
  logger: ToolRegistrationContext['logger'];
}) {
  switch (input.action) {
    case 'list': {
      const response = await client.listReminders({
        contactId: input.contactId,
        limit: input.limit,
        page: input.page
      });
      const reminders = response.data.map(normalizeReminder);
      const scope = input.contactId ? `contact ${input.contactId}` : 'your account';
      const text = reminders.length
        ? `Found ${reminders.length} reminder${reminders.length === 1 ? '' : 's'} for ${scope}.`
        : `No reminders found for ${scope}.`;

      return {
        content: [
          {
            type: 'text' as const,
            text
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          contactId: input.contactId,
          reminders,
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
      const response = await client.getReminder(input.reminderId!);
      const reminder = normalizeReminder(response.data);
      const contactName = reminder.contact?.name || `Contact ${reminder.contactId}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: `Reminder "${reminder.title}" for ${contactName}. Next due ${reminder.nextExpectedDate ?? 'unknown'}.`
          }
        ],
        structuredContent: {
          itemType: input.itemType,
          action: input.action,
          reminder
        }
      };
    }

    case 'create': {
      const payload = input.reminderPayload!;
      let createPayload: CreateReminderPayload;
      try {
        createPayload = toReminderCreatePayload(payload);
      } catch (error) {
        return {
          isError: true as const,
          content: [
            { type: 'text' as const, text: (error as Error).message }
          ]
        };
      }

      try {
        const response = await client.createReminder(createPayload);
        const reminder = normalizeReminder(response.data);
        logger.info({ reminderId: reminder.id, contactId: reminder.contactId }, 'Created Monica reminder');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Created reminder "${reminder.title}" for contact ${reminder.contactId}.`
            }
          ],
          structuredContent: {
            itemType: input.itemType,
            action: input.action,
            reminder
          }
        };
      } catch (error) {
        if (error instanceof MonicaApiError) {
          return buildErrorResponse(formatMonicaApiError(error));
        }
        throw error;
      }
    }

    case 'update': {
      const payload = input.reminderPayload!;
      let updatePayload: UpdateReminderPayload;
      try {
        updatePayload = toReminderUpdatePayload(payload);
      } catch (error) {
        return {
          isError: true as const,
          content: [
            { type: 'text' as const, text: (error as Error).message }
          ]
        };
      }

      try {
        const response = await client.updateReminder(input.reminderId!, updatePayload);
        const reminder = normalizeReminder(response.data);
        logger.info({ reminderId: input.reminderId }, 'Updated Monica reminder');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Updated reminder "${reminder.title}" (ID ${reminder.id}).`
            }
          ],
          structuredContent: {
            itemType: input.itemType,
            action: input.action,
            reminderId: input.reminderId,
            reminder
          }
        };
      } catch (error) {
        if (error instanceof MonicaApiError) {
          return buildErrorResponse(formatMonicaApiError(error));
        }
        throw error;
      }
    }

    case 'delete': {
      try {
        const result = await client.deleteReminder(input.reminderId!);
        logger.info({ reminderId: input.reminderId }, 'Deleted Monica reminder');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Deleted reminder ID ${input.reminderId}.`
            }
          ],
          structuredContent: {
            itemType: input.itemType,
            action: input.action,
            reminderId: input.reminderId,
            result
          }
        };
      } catch (error) {
        if (error instanceof MonicaApiError) {
          return buildErrorResponse(formatMonicaApiError(error));
        }
        throw error;
      }
    }

    default:
      return unreachable(input.action as never);
  }
}

function toTaskCreatePayload(payload: TaskPayloadForm): CreateTaskPayload {
  return {
    title: payload.title!,
    description: payload.description ?? null,
    status: payload.status ?? 'open',
    completedAt: payload.completedAt ?? null,
    contactId: payload.contactId!
  };
}

function toTaskUpdatePayload(payload: TaskPayloadForm): UpdateTaskPayload {
  return {
    title: payload.title ?? undefined,
    description: payload.description ?? undefined,
    status: payload.status ?? undefined,
    completedAt: payload.completedAt ?? undefined,
    contactId: payload.contactId ?? undefined
  };
}

function toReminderCreatePayload(payload: ReminderPayloadForm): CreateReminderPayload {
  if (!payload.contactId) {
    throw new Error('Provide contactId when creating a reminder.');
  }
  if (!payload.nextExpectedDate) {
    throw new Error('Provide nextExpectedDate when creating a reminder.');
  }
  if (!payload.frequencyType) {
    throw new Error('Provide frequencyType when creating a reminder.');
  }

  const frequencyNumber =
    payload.frequencyType === 'one_time'
      ? undefined
      : payload.frequencyNumber ?? 1;

  return {
    title: payload.title || 'Stay in touch',
    description: payload.description ?? null,
    nextExpectedDate: payload.nextExpectedDate,
    frequencyType: payload.frequencyType,
    frequencyNumber,
    contactId: payload.contactId
  };
}

function toReminderUpdatePayload(payload: ReminderPayloadForm): UpdateReminderPayload {
  const result: UpdateReminderPayload = {};

  if (payload.title !== undefined) {
    result.title = payload.title;
  }
  if (payload.description !== undefined) {
    result.description = payload.description ?? null;
  }
  if (payload.nextExpectedDate !== undefined) {
    result.nextExpectedDate = payload.nextExpectedDate;
  }
  if (payload.frequencyType !== undefined) {
    result.frequencyType = payload.frequencyType;
  }
  if (payload.frequencyNumber !== undefined) {
    result.frequencyNumber = payload.frequencyNumber;
  }
  if (payload.contactId !== undefined) {
    result.contactId = payload.contactId;
  }

  return result;
}

function formatMonicaApiError(error: MonicaApiError): string {
  const details = extractMonicaErrorDetails(error.data);
  const requestSuffix = error.requestId ? ` (request id ${error.requestId})` : '';
  return details ? `${error.message}${requestSuffix}. ${details}` : `${error.message}${requestSuffix}.`;
}

function extractMonicaErrorDetails(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const segments: string[] = [];

  if (typeof record.message === 'string' && record.message.trim()) {
    segments.push(record.message.trim());
  }

  const errors = record.errors;
  if (errors && typeof errors === 'object') {
    for (const [field, explanation] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(explanation)) {
        const joined = explanation
          .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry)))
          .filter(Boolean)
          .join('; ');
        if (joined) {
          segments.push(`${field}: ${joined}`);
        }
      } else if (typeof explanation === 'string' && explanation.trim()) {
        segments.push(`${field}: ${explanation.trim()}`);
      }
    }
  }

  return segments.length ? segments.join(' ') : undefined;
}

function unreachable(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
