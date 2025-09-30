import { readFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, resolve as resolvePath } from 'node:path';
import { z } from 'zod';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeDocument, normalizePhoto } from '../../utils/formatters.js';

const mediaInputShape = {
    mediaType: z.enum(['document', 'photo']),
    action: z.enum(['list', 'get', 'upload', 'delete']),
    mediaId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
    filePath: z.string().min(1).optional(),
    base64Data: z.string().min(1).optional(),
    fileName: z.string().min(1).optional(),
    mimeType: z.string().min(1).optional()
  } as const;

const mediaInputSchema = z
  .object(mediaInputShape)
  .superRefine((input, ctx) => {
    if (['get', 'delete'].includes(input.action) && input.mediaId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mediaId is required for get and delete actions.',
        path: ['mediaId']
      });
    }

    if (input.action === 'upload') {
      if (!input.filePath && !input.base64Data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide either filePath or base64Data when uploading media.',
          path: ['filePath']
        });
      }

      if (input.filePath && input.base64Data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose either filePath or base64Data, not both.',
          path: ['filePath']
        });
      }

      if (!input.filePath && !input.fileName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'fileName is required when providing base64Data directly.',
          path: ['fileName']
        });
      }
    }

  });

type MediaInput = z.infer<typeof mediaInputSchema>;
type DocumentInput = MediaInput & { mediaType: 'document' };
type PhotoInput = MediaInput & { mediaType: 'photo' };

type HandlerArgs<T extends MediaInput> = {
  input: T;
  client: ToolRegistrationContext['client'];
  logger: ToolRegistrationContext['logger'];
};

export function registerMediaTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_manage_media',
    {
      title: 'Manage Monica documents and photos',
      description:
        'List, inspect, upload, or delete documents and photos stored in Monica. Use mediaType to pick the resource.',
      inputSchema: mediaInputShape
    },
    async (rawInput: unknown) => {
      const input = mediaInputSchema.parse(rawInput);

      if (input.mediaType === 'document') {
        return handleDocument({ input: input as DocumentInput, client, logger });
      }

      return handlePhoto({ input: input as PhotoInput, client, logger });
    }
  );
}

async function handleDocument({ input, client, logger }: HandlerArgs<DocumentInput>) {
  switch (input.action) {
    case 'list': {
      const response = await client.listDocuments({
        contactId: input.contactId,
        limit: input.limit,
        page: input.page
      });
      const documents = response.data.map(normalizeDocument);

      return buildListResponse({
        mediaType: input.mediaType,
        action: input.action,
        contactId: input.contactId,
        records: documents,
        pagination: response.meta
      });
    }

    case 'get': {
      if (input.mediaId == null) {
        return missingMediaIdError('document', input.action);
      }

      const response = await client.getDocument(input.mediaId);
      const document = normalizeDocument(response.data);

      return buildSingleRecordResponse({
        mediaType: input.mediaType,
        action: input.action,
        mediaId: input.mediaId,
        record: document,
        text: `Document ${document.originalFilename} (ID ${document.id}).`
      });
    }

    case 'upload': {
      const upload = await prepareUploadPayload(input);
      const response = await client.uploadDocument({
        base64Data: upload.base64Data,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        contactId: input.contactId
      });
      const document = normalizeDocument(response.data);
      logger.info({ documentId: document.id, contactId: input.contactId }, 'Uploaded Monica document');

      return buildSingleRecordResponse({
        mediaType: input.mediaType,
        action: input.action,
        record: document,
        text: `Uploaded document ${document.originalFilename} (ID ${document.id}).`
      });
    }

    case 'delete': {
      if (input.mediaId == null) {
        return missingMediaIdError('document', input.action);
      }

      await client.deleteDocument(input.mediaId);
      logger.info({ documentId: input.mediaId }, 'Deleted Monica document');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted document ID ${input.mediaId}.`
          }
        ],
        structuredContent: {
          mediaType: input.mediaType,
          action: input.action,
          mediaId: input.mediaId,
          deleted: true
        }
      };
    }

    default:
      return unknownActionError(input.action);
  }
}

async function handlePhoto({ input, client, logger }: HandlerArgs<PhotoInput>) {
  switch (input.action) {
    case 'list': {
      const response = await client.listPhotos({
        contactId: input.contactId,
        limit: input.limit,
        page: input.page
      });
      const photos = response.data.map(normalizePhoto);

      return buildListResponse({
        mediaType: input.mediaType,
        action: input.action,
        contactId: input.contactId,
        records: photos,
        pagination: response.meta
      });
    }

    case 'get': {
      if (input.mediaId == null) {
        return missingMediaIdError('photo', input.action);
      }

      const response = await client.getPhoto(input.mediaId);
      const photo = normalizePhoto(response.data);

      return buildSingleRecordResponse({
        mediaType: input.mediaType,
        action: input.action,
        mediaId: input.mediaId,
        record: photo,
        text: `Photo ${photo.originalFilename} (ID ${photo.id}).`
      });
    }

    case 'upload': {
      const upload = await prepareUploadPayload(input);
      const response = await client.uploadPhoto({
        base64Data: upload.base64Data,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        contactId: input.contactId
      });
      const photo = normalizePhoto(response.data);
      logger.info({ photoId: photo.id, contactId: input.contactId }, 'Uploaded Monica photo');

      return buildSingleRecordResponse({
        mediaType: input.mediaType,
        action: input.action,
        record: photo,
        text: `Uploaded photo ${photo.originalFilename} (ID ${photo.id}).`
      });
    }

    case 'delete': {
      if (input.mediaId == null) {
        return missingMediaIdError('photo', input.action);
      }

      await client.deletePhoto(input.mediaId);
      logger.info({ photoId: input.mediaId }, 'Deleted Monica photo');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted photo ID ${input.mediaId}.`
          }
        ],
        structuredContent: {
          mediaType: input.mediaType,
          action: input.action,
          mediaId: input.mediaId,
          deleted: true
        }
      };
    }

    default:
      return unknownActionError(input.action);
  }
}

function missingMediaIdError(mediaType: 'document' | 'photo', action: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Provide a ${mediaType} mediaId when using the ${action} action.`
      }
    ]
  };
}

function unknownActionError(action: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Unsupported action: ${action}`
      }
    ]
  };
}

async function prepareUploadPayload(input: MediaInput) {
  if (!input.filePath && !input.base64Data) {
    throw new Error('Provide either filePath or base64Data for uploads.');
  }

  if (input.filePath) {
    const resolvedPath = resolveFilePath(input.filePath);

    try {
      const fileBuffer = await readFile(resolvedPath);
      const fileName = input.fileName ? basename(input.fileName) : basename(resolvedPath);
      const mimeType = resolveMimeType(fileName, input.mimeType);

      return {
        base64Data: fileBuffer.toString('base64'),
        fileName,
        mimeType
      };
    } catch (error) {
      throw new Error(`Unable to read file at ${resolvedPath}: ${(error as Error).message}`);
    }
  }

  if (!input.base64Data || !input.fileName) {
    throw new Error('Provide base64Data and fileName when not using filePath.');
  }

  const fileName = basename(input.fileName);
  return {
    base64Data: input.base64Data,
    fileName,
    mimeType: resolveMimeType(fileName, input.mimeType)
  };
}

function resolveFilePath(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }

  return resolvePath(process.cwd(), filePath);
}

function resolveMimeType(fileName: string, provided?: string): string {
  if (provided) {
    return provided;
  }

  const extension = extname(fileName).toLowerCase();

  return MIME_LOOKUP[extension] ?? 'application/octet-stream';
}

function buildListResponse({
  mediaType,
  action,
  contactId,
  records,
  pagination
}: {
  mediaType: 'document' | 'photo';
  action: string;
  contactId?: number;
  records: Array<ReturnType<typeof normalizeDocument> | ReturnType<typeof normalizePhoto>>;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}) {
  const scope = contactId ? `contact ${contactId}` : 'your account';
  const summary = records.length
    ? `Found ${records.length} ${mediaType}${records.length === 1 ? '' : 's'} for ${scope}.`
    : `No ${mediaType}s found for ${scope}.`;

  const key = mediaType === 'document' ? 'documents' : 'photos';

  return {
    content: [
      {
        type: 'text' as const,
        text: summary
      }
    ],
    structuredContent: {
      mediaType,
      action,
      contactId,
      [key]: records,
      pagination: {
        currentPage: pagination.current_page,
        lastPage: pagination.last_page,
        perPage: pagination.per_page,
        total: pagination.total
      }
    }
  };
}

function buildSingleRecordResponse({
  mediaType,
  action,
  mediaId,
  record,
  text
}: {
  mediaType: 'document' | 'photo';
  action: string;
  mediaId?: number;
  record: ReturnType<typeof normalizeDocument> | ReturnType<typeof normalizePhoto>;
  text: string;
}) {
  const key = mediaType === 'document' ? 'document' : 'photo';

  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ],
    structuredContent: {
      mediaType,
      action,
      mediaId: mediaId ?? record.id,
      [key]: record
    }
  };
}

const MIME_LOOKUP: Record<string, string> = {
  '.aac': 'audio/aac',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};
