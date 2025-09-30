import type { Logger } from 'pino';
import {
  MonicaPaginatedResponse,
  MonicaContact,
  MonicaNote,
  MonicaSingleResponse,
  MonicaTask,
  MonicaDeleteResponse,
  MonicaActivity,
  MonicaAddress,
  MonicaContactField,
  MonicaContactFieldType,
  MonicaActivityType,
  MonicaActivityTypeCategory,
  MonicaCountry,
  MonicaGender,
  MonicaGroup,
  MonicaConversation,
  MonicaConversationMessage,
  MonicaCall,
  MonicaRelationship,
  MonicaRelationshipType,
  MonicaRelationshipTypeGroup,
  MonicaReminder,
  MonicaTag,
  MonicaCurrency,
  MonicaOccupation,
  MonicaDocument,
  MonicaPhoto,
  MonicaGift,
  MonicaDebt
} from '../types.js';

export type MonicaTokenType = 'bearer' | 'apiKey' | 'legacy';

export interface MonicaClientOptions {
  baseUrl: string;
  token: string;
  tokenType: MonicaTokenType;
  userToken?: string;
  logger: Logger;
  defaultTimeoutMs?: number;
}

export interface RequestOptions extends RequestInit {
  searchParams?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export interface SearchContactsOptions {
  query: string;
  limit?: number;
  page?: number;
  includePartial?: boolean;
}

export interface ListTasksOptions {
  contactId?: number;
  limit?: number;
  page?: number;
  status?: 'open' | 'completed' | 'all';
}

export interface ListRelationshipsOptions {
  contactId: number;
  limit?: number;
  page?: number;
}

export interface ListRelationshipTypesOptions {
  limit?: number;
  page?: number;
}

export interface ListRelationshipTypeGroupsOptions {
  limit?: number;
  page?: number;
}

export interface ListGroupsOptions {
  limit?: number;
  page?: number;
}

export interface ListRemindersOptions {
  contactId?: number;
  limit?: number;
  page?: number;
}

export interface ListConversationsOptions {
  contactId?: number;
  limit?: number;
  page?: number;
}

export interface ListCallsOptions {
  contactId?: number;
  limit?: number;
  page?: number;
}

export interface CreateNotePayload {
  contactId: number;
  body: string;
  isFavorited?: boolean;
}

export interface UpdateNotePayload {
  contactId?: number;
  body?: string;
  isFavorited?: boolean;
}

export interface ListActivitiesOptions {
  contactId?: number;
  limit?: number;
  page?: number;
}

export interface CreateActivityPayload {
  activityTypeId: number;
  summary: string;
  description?: string | null;
  happenedAt: string;
  contactIds: number[];
  emotionIds?: number[];
}

export type UpdateActivityPayload = CreateActivityPayload;

export interface ListAddressesOptions {
  contactId: number;
  limit?: number;
  page?: number;
}

export interface CreateAddressPayload {
  contactId: number;
  name: string;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryId?: string | null;
}

export type UpdateAddressPayload = CreateAddressPayload;

export interface ListActivityTypesOptions {
  limit?: number;
  page?: number;
}

export interface CreateActivityTypePayload {
  name: string;
  categoryId: number;
  locationType?: string | null;
}

export type UpdateActivityTypePayload = CreateActivityTypePayload;

export interface ListActivityTypeCategoriesOptions {
  limit?: number;
  page?: number;
}

export interface CreateActivityTypeCategoryPayload {
  name: string;
}

export type UpdateActivityTypeCategoryPayload = CreateActivityTypeCategoryPayload;

export interface CreateRelationshipPayload {
  contactIsId: number;
  relationshipTypeId: number;
  ofContactId: number;
}

export interface UpdateRelationshipPayload {
  relationshipTypeId: number;
}

export interface CreateRelationshipTypePayload {
  name: string;
  reverseName: string;
  relationshipTypeGroupId?: number | null;
  delible?: boolean;
}

export type UpdateRelationshipTypePayload = CreateRelationshipTypePayload;

export interface CreateRelationshipTypeGroupPayload {
  name: string;
  delible?: boolean;
}

export type UpdateRelationshipTypeGroupPayload = CreateRelationshipTypeGroupPayload;

export interface CreateGroupPayload {
  name: string;
}

export type UpdateGroupPayload = CreateGroupPayload;

export interface CreateReminderPayload {
  title: string;
  description?: string | null;
  nextExpectedDate: string;
  frequencyType: 'one_time' | 'day' | 'week' | 'month' | 'year';
  frequencyNumber?: number | null;
  contactId: number;
}

export interface UpdateReminderPayload {
  title?: string;
  description?: string | null;
  nextExpectedDate?: string;
  frequencyType?: 'one_time' | 'day' | 'week' | 'month' | 'year';
  frequencyNumber?: number | null;
  contactId?: number;
}

export interface CreateConversationPayload {
  happenedAt: string;
  contactFieldTypeId: number;
  contactId: number;
}

export interface UpdateConversationPayload {
  happenedAt: string;
}

export interface CreateConversationMessagePayload {
  contactId: number;
  writtenAt: string;
  writtenByMe: boolean;
  content: string;
}

export interface UpdateConversationMessagePayload {
  contactId: number;
  writtenAt: string;
  writtenByMe: boolean;
  content: string;
}

export interface CreateCallPayload {
  contactId: number;
  calledAt: string;
  content?: string | null;
}

export interface UpdateCallPayload {
  contactId?: number;
  calledAt?: string;
  content?: string | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: 'open' | 'completed';
  completedAt?: string | null;
  contactId: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: 'open' | 'completed';
  completedAt?: string | null;
  contactId?: number;
}

export interface ListContactFieldTypesOptions {
  limit?: number;
  page?: number;
}

export interface CreateContactFieldTypePayload {
  name: string;
  fontawesomeIcon?: string | null;
  protocol?: string | null;
  delible?: boolean;
  kind?: string | null;
}

export type UpdateContactFieldTypePayload = CreateContactFieldTypePayload;

export interface ListContactFieldsOptions {
  contactId: number;
  limit?: number;
  page?: number;
}

export interface ListCurrenciesOptions {
  limit?: number;
  page?: number;
}

export interface ListOccupationsOptions {
  limit?: number;
  page?: number;
}

export interface CreateContactFieldPayload {
  contactId: number;
  contactFieldTypeId: number;
  data: string;
}

export type UpdateContactFieldPayload = CreateContactFieldPayload;


export interface CreateGiftPayload {
  contactId: number;
  receivedOn: string;
  title: string;
  description?: string | null;
  wasGivenByMe?: boolean;
  amount?: number | null;
  currencyId?: number | null;
}

export type UpdateGiftPayload = Partial<CreateGiftPayload>;

export interface CreateDebtPayload {
  contactId: number;
  description?: string | null;
  amount: number;
  currencyId?: number | null;
  happenedAt: string;
  isSettled?: boolean;
  settledAt?: string | null;
}

export type UpdateDebtPayload = Partial<CreateDebtPayload>;

export interface UploadDocumentPayload {
  base64Data: string;
  fileName: string;
  mimeType?: string;
  contactId?: number;
}

export interface UploadPhotoPayload {
  base64Data: string;
  fileName: string;
  mimeType?: string;
  contactId?: number;
}

export interface CreateTagPayload {
  name: string;
}

export type UpdateTagPayload = CreateTagPayload;

export type BirthdateInput =
  | {
      type: 'exact';
      day: number;
      month: number;
      year: number;
    }
  | {
      type: 'age';
      age: number;
    }
  | {
      type: 'unknown';
    };

export type DeceasedDateInput =
  | {
      type: 'exact';
      day: number;
      month: number;
      year: number;
    }
  | {
      type: 'age';
      age: number;
    }
  | {
      type: 'unknown';
    };

export interface ContactProfileInput {
  firstName: string;
  lastName?: string | null;
  nickname?: string | null;
  genderId?: number;
  description?: string | null;
  isPartial?: boolean;
  isDeceased?: boolean;
  birthdate?: BirthdateInput;
  deceasedDate?: DeceasedDateInput;
  remindOnDeceasedDate?: boolean;
}

export class MonicaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
    public readonly requestId?: string | null
  ) {
    super(message);
    this.name = 'MonicaApiError';
  }
}

export class MonicaClient {
  private readonly apiBaseUrl: string;
  private readonly logger: Logger;
  private readonly defaultTimeoutMs: number;

  constructor(private readonly options: MonicaClientOptions) {
    this.apiBaseUrl = `${options.baseUrl.replace(/\/$/, '')}/api/`;
    this.logger = options.logger;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15000;

    if (options.tokenType === 'legacy' && !options.userToken) {
      throw new Error('Legacy authentication requires both token and user token.');
    }
  }

  async searchContacts(options: SearchContactsOptions): Promise<MonicaPaginatedResponse<MonicaContact>> {
    const response = await this.request<MonicaPaginatedResponse<MonicaContact>>('contacts', {
      searchParams: {
        query: options.query,
        limit: options.limit,
        page: options.page
      }
    });

    if (options.includePartial === false) {
      response.data = response.data.filter((contact) => !contact.is_partial);
    }

    return response;
  }

  async getContact(id: number, includeContactFields = false): Promise<MonicaSingleResponse<MonicaContact>> {
    return this.request<MonicaSingleResponse<MonicaContact>>(`contacts/${id}`, {
      searchParams: includeContactFields ? { with: 'contactfields' } : undefined
    });
  }

  async listTasks(options: ListTasksOptions = {}): Promise<MonicaPaginatedResponse<MonicaTask>> {
    const status = options.status ?? 'open';
    const sharedSearchParams: Record<string, string | number | boolean | undefined> = {
      limit: options.limit,
      page: options.page
    };

    if (status === 'open') {
      sharedSearchParams.completed = 0;
    } else if (status === 'completed') {
      sharedSearchParams.completed = 1;
    }

    if (options.contactId) {
      return this.request<MonicaPaginatedResponse<MonicaTask>>(`contacts/${options.contactId}/tasks`, {
        searchParams: sharedSearchParams
      });
    }

    return this.request<MonicaPaginatedResponse<MonicaTask>>('tasks', {
      searchParams: sharedSearchParams
    });
  }

  async listRelationships(
    options: ListRelationshipsOptions
  ): Promise<MonicaPaginatedResponse<MonicaRelationship>> {
    return this.request<MonicaPaginatedResponse<MonicaRelationship>>(
      `contacts/${options.contactId}/relationships`,
      {
        searchParams: {
          limit: options.limit,
          page: options.page
        }
      }
    );
  }

  async getRelationship(relationshipId: number): Promise<MonicaSingleResponse<MonicaRelationship>> {
    return this.request<MonicaSingleResponse<MonicaRelationship>>(`relationships/${relationshipId}`);
  }

  async createRelationship(
    payload: CreateRelationshipPayload
  ): Promise<MonicaSingleResponse<MonicaRelationship>> {
    const body = buildRelationshipCreateRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationship>>('relationships', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateRelationship(
    relationshipId: number,
    payload: UpdateRelationshipPayload
  ): Promise<MonicaSingleResponse<MonicaRelationship>> {
    const body = buildRelationshipUpdateRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationship>>(`relationships/${relationshipId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteRelationship(relationshipId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`relationships/${relationshipId}`, {
      method: 'DELETE'
    });
  }

  async listRelationshipTypes(
    options: ListRelationshipTypesOptions = {}
  ): Promise<MonicaPaginatedResponse<MonicaRelationshipType>> {
    return this.request<MonicaPaginatedResponse<MonicaRelationshipType>>('relationshiptypes', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getRelationshipType(
    relationshipTypeId: number
  ): Promise<MonicaSingleResponse<MonicaRelationshipType>> {
    return this.request<MonicaSingleResponse<MonicaRelationshipType>>(`relationshiptypes/${relationshipTypeId}`);
  }

  async createRelationshipType(
    payload: CreateRelationshipTypePayload
  ): Promise<MonicaSingleResponse<MonicaRelationshipType>> {
    const body = buildRelationshipTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationshipType>>('relationshiptypes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateRelationshipType(
    relationshipTypeId: number,
    payload: UpdateRelationshipTypePayload
  ): Promise<MonicaSingleResponse<MonicaRelationshipType>> {
    const body = buildRelationshipTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationshipType>>(`relationshiptypes/${relationshipTypeId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteRelationshipType(relationshipTypeId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`relationshiptypes/${relationshipTypeId}`, {
      method: 'DELETE'
    });
  }

  async listRelationshipTypeGroups(
    options: ListRelationshipTypeGroupsOptions = {}
  ): Promise<MonicaPaginatedResponse<MonicaRelationshipTypeGroup>> {
    return this.request<MonicaPaginatedResponse<MonicaRelationshipTypeGroup>>('relationshiptypegroups', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getRelationshipTypeGroup(
    relationshipTypeGroupId: number
  ): Promise<MonicaSingleResponse<MonicaRelationshipTypeGroup>> {
    return this.request<MonicaSingleResponse<MonicaRelationshipTypeGroup>>(
      `relationshiptypegroups/${relationshipTypeGroupId}`
    );
  }

  async createRelationshipTypeGroup(
    payload: CreateRelationshipTypeGroupPayload
  ): Promise<MonicaSingleResponse<MonicaRelationshipTypeGroup>> {
    const body = buildRelationshipTypeGroupRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationshipTypeGroup>>('relationshiptypegroups', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateRelationshipTypeGroup(
    relationshipTypeGroupId: number,
    payload: UpdateRelationshipTypeGroupPayload
  ): Promise<MonicaSingleResponse<MonicaRelationshipTypeGroup>> {
    const body = buildRelationshipTypeGroupRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaRelationshipTypeGroup>>(
      `relationshiptypegroups/${relationshipTypeGroupId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    );
  }

  async deleteRelationshipTypeGroup(
    relationshipTypeGroupId: number
  ): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`relationshiptypegroups/${relationshipTypeGroupId}`, {
      method: 'DELETE'
    });
  }

  async listGroups(options: ListGroupsOptions = {}): Promise<MonicaPaginatedResponse<MonicaGroup>> {
    return this.request<MonicaPaginatedResponse<MonicaGroup>>('groups', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getGroup(groupId: number): Promise<MonicaSingleResponse<MonicaGroup>> {
    return this.request<MonicaSingleResponse<MonicaGroup>>(`groups/${groupId}`);
  }

  async createGroup(payload: CreateGroupPayload): Promise<MonicaSingleResponse<MonicaGroup>> {
    const body = buildGroupRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaGroup>>('groups', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateGroup(
    groupId: number,
    payload: UpdateGroupPayload
  ): Promise<MonicaSingleResponse<MonicaGroup>> {
    const body = buildGroupRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaGroup>>(`groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteGroup(groupId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`groups/${groupId}`, {
      method: 'DELETE'
    });
  }

  async listConversations(
    options: ListConversationsOptions = {}
  ): Promise<MonicaPaginatedResponse<MonicaConversation>> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      limit: options.limit,
      page: options.page
    };

    if (options.contactId) {
      return this.request<MonicaPaginatedResponse<MonicaConversation>>(
        `contacts/${options.contactId}/conversations`,
        {
          searchParams
        }
      );
    }

    return this.request<MonicaPaginatedResponse<MonicaConversation>>('conversations', {
      searchParams
    });
  }

  async getConversation(conversationId: number): Promise<MonicaSingleResponse<MonicaConversation>> {
    return this.request<MonicaSingleResponse<MonicaConversation>>(`conversations/${conversationId}`);
  }

  async createConversation(
    payload: CreateConversationPayload
  ): Promise<MonicaSingleResponse<MonicaConversation>> {
    const body = buildConversationCreateRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaConversation>>('conversations', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateConversation(
    conversationId: number,
    payload: UpdateConversationPayload
  ): Promise<MonicaSingleResponse<MonicaConversation>> {
    const body = buildConversationUpdateRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaConversation>>(`conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteConversation(conversationId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }

  async addConversationMessage(
    conversationId: number,
    payload: CreateConversationMessagePayload
  ): Promise<MonicaSingleResponse<MonicaConversation>> {
    const body = buildConversationMessageRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaConversation>>(
      `conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  async updateConversationMessage(
    conversationId: number,
    messageId: number,
    payload: UpdateConversationMessagePayload
  ): Promise<MonicaSingleResponse<MonicaConversation>> {
    const body = buildConversationMessageRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaConversation>>(
      `conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    );
  }

  async deleteConversationMessage(
    conversationId: number,
    messageId: number
  ): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  async listCalls(options: ListCallsOptions = {}): Promise<MonicaPaginatedResponse<MonicaCall>> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      limit: options.limit,
      page: options.page
    };

    if (options.contactId) {
      return this.request<MonicaPaginatedResponse<MonicaCall>>(
        `contacts/${options.contactId}/calls`,
        { searchParams }
      );
    }

    return this.request<MonicaPaginatedResponse<MonicaCall>>('calls', { searchParams });
  }

  async getCall(callId: number): Promise<MonicaSingleResponse<MonicaCall>> {
    return this.request<MonicaSingleResponse<MonicaCall>>(`calls/${callId}`);
  }

  async createCall(payload: CreateCallPayload): Promise<MonicaSingleResponse<MonicaCall>> {
    const body = buildCallRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaCall>>('calls', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateCall(callId: number, payload: UpdateCallPayload): Promise<MonicaSingleResponse<MonicaCall>> {
    const existing = await this.getCall(callId);
    const merged = mergeCallPayload(existing.data, payload);
    const body = buildCallRequestBody(merged);
    return this.request<MonicaSingleResponse<MonicaCall>>(`calls/${callId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteCall(callId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`calls/${callId}`, {
      method: 'DELETE'
    });
  }

  async listReminders(options: ListRemindersOptions = {}): Promise<MonicaPaginatedResponse<MonicaReminder>> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      limit: options.limit,
      page: options.page
    };

    if (options.contactId) {
      return this.request<MonicaPaginatedResponse<MonicaReminder>>(
        `contacts/${options.contactId}/reminders`,
        {
          searchParams
        }
      );
    }

    return this.request<MonicaPaginatedResponse<MonicaReminder>>('reminders', {
      searchParams
    });
  }

  async getReminder(reminderId: number): Promise<MonicaSingleResponse<MonicaReminder>> {
    return this.request<MonicaSingleResponse<MonicaReminder>>(`reminders/${reminderId}`);
  }

  async createReminder(
    payload: CreateReminderPayload
  ): Promise<MonicaSingleResponse<MonicaReminder>> {
    const body = buildReminderRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaReminder>>('reminders', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateReminder(
    reminderId: number,
    payload: UpdateReminderPayload
  ): Promise<MonicaSingleResponse<MonicaReminder>> {
    const existing = await this.getReminder(reminderId);
    const merged = mergeReminderPayload(existing.data, payload);
    const body = buildReminderRequestBody(merged);
    return this.request<MonicaSingleResponse<MonicaReminder>>(`reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteReminder(reminderId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`reminders/${reminderId}`, {
      method: 'DELETE'
    });
  }

  async createNote(payload: CreateNotePayload): Promise<MonicaSingleResponse<MonicaNote>> {
    return this.request<MonicaSingleResponse<MonicaNote>>('notes', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: payload.contactId,
        body: payload.body,
        is_favorited: payload.isFavorited ? 1 : 0
      })
    });
  }

  async getNote(noteId: number): Promise<MonicaSingleResponse<MonicaNote>> {
    return this.request<MonicaSingleResponse<MonicaNote>>(`notes/${noteId}`);
  }

  async updateNote(noteId: number, payload: UpdateNotePayload): Promise<MonicaSingleResponse<MonicaNote>> {
    const existing = await this.getNote(noteId);
    const body = buildNoteRequestBody(existing.data, payload);
    return this.request<MonicaSingleResponse<MonicaNote>>(`notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteNote(noteId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`notes/${noteId}`, {
      method: 'DELETE'
    });
  }

  async listActivities(options: ListActivitiesOptions = {}): Promise<MonicaPaginatedResponse<MonicaActivity>> {
    const searchParams: Record<string, string | number | boolean | undefined> = {
      limit: options.limit,
      page: options.page
    };

    const path = options.contactId ? `contacts/${options.contactId}/activities` : 'activities';

    return this.request<MonicaPaginatedResponse<MonicaActivity>>(path, {
      searchParams
    });
  }

  async getActivity(activityId: number): Promise<MonicaSingleResponse<MonicaActivity>> {
    return this.request<MonicaSingleResponse<MonicaActivity>>(`activities/${activityId}`);
  }

  async createActivity(payload: CreateActivityPayload): Promise<MonicaSingleResponse<MonicaActivity>> {
    const body = buildActivityRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivity>>('activities', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateActivity(activityId: number, payload: UpdateActivityPayload): Promise<MonicaSingleResponse<MonicaActivity>> {
    const body = buildActivityRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivity>>(`activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteActivity(activityId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`activities/${activityId}`, {
      method: 'DELETE'
    });
  }

  async getTask(taskId: number): Promise<MonicaSingleResponse<MonicaTask>> {
    return this.request<MonicaSingleResponse<MonicaTask>>(`tasks/${taskId}`);
  }

  async createTask(payload: CreateTaskPayload): Promise<MonicaSingleResponse<MonicaTask>> {
    const body = buildTaskRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaTask>>('task/', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateTask(taskId: number, payload: UpdateTaskPayload): Promise<MonicaSingleResponse<MonicaTask>> {
    const existing = await this.getTask(taskId);
    const body = buildTaskRequestBody(mergeTaskPayload(existing.data, payload));
    return this.request<MonicaSingleResponse<MonicaTask>>(`tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteTask(taskId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  async listAddresses(options: ListAddressesOptions): Promise<MonicaPaginatedResponse<MonicaAddress>> {
    if (!options.contactId) {
      throw new Error('contactId is required when listing addresses.');
    }

    return this.request<MonicaPaginatedResponse<MonicaAddress>>(`contacts/${options.contactId}/addresses`, {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getAddress(addressId: number): Promise<MonicaSingleResponse<MonicaAddress>> {
    return this.request<MonicaSingleResponse<MonicaAddress>>(`addresses/${addressId}`);
  }

  async createAddress(payload: CreateAddressPayload): Promise<MonicaSingleResponse<MonicaAddress>> {
    const body = buildAddressRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaAddress>>('addresses', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateAddress(addressId: number, payload: UpdateAddressPayload): Promise<MonicaSingleResponse<MonicaAddress>> {
    const body = buildAddressRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaAddress>>(`addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteAddress(addressId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`addresses/${addressId}`, {
      method: 'DELETE'
    });
  }

  async listActivityTypes(options: ListActivityTypesOptions = {}): Promise<MonicaPaginatedResponse<MonicaActivityType>> {
    return this.request<MonicaPaginatedResponse<MonicaActivityType>>('activitytypes', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getActivityType(activityTypeId: number): Promise<MonicaSingleResponse<MonicaActivityType>> {
    return this.request<MonicaSingleResponse<MonicaActivityType>>(`activitytypes/${activityTypeId}`);
  }

  async createActivityType(payload: CreateActivityTypePayload): Promise<MonicaSingleResponse<MonicaActivityType>> {
    const body = buildActivityTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivityType>>('activitytypes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateActivityType(
    activityTypeId: number,
    payload: UpdateActivityTypePayload
  ): Promise<MonicaSingleResponse<MonicaActivityType>> {
    const body = buildActivityTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivityType>>(`activitytypes/${activityTypeId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteActivityType(activityTypeId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`activitytypes/${activityTypeId}`, {
      method: 'DELETE'
    });
  }

  async listActivityTypeCategories(
    options: ListActivityTypeCategoriesOptions = {}
  ): Promise<MonicaPaginatedResponse<MonicaActivityTypeCategory>> {
    return this.request<MonicaPaginatedResponse<MonicaActivityTypeCategory>>('activitytypecategories', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getActivityTypeCategory(
    activityTypeCategoryId: number
  ): Promise<MonicaSingleResponse<MonicaActivityTypeCategory>> {
    return this.request<MonicaSingleResponse<MonicaActivityTypeCategory>>(
      `activitytypecategories/${activityTypeCategoryId}`
    );
  }

  async createActivityTypeCategory(
    payload: CreateActivityTypeCategoryPayload
  ): Promise<MonicaSingleResponse<MonicaActivityTypeCategory>> {
    const body = buildActivityTypeCategoryRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivityTypeCategory>>('activitytypecategories', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateActivityTypeCategory(
    activityTypeCategoryId: number,
    payload: UpdateActivityTypeCategoryPayload
  ): Promise<MonicaSingleResponse<MonicaActivityTypeCategory>> {
    const body = buildActivityTypeCategoryRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaActivityTypeCategory>>(
      `activitytypecategories/${activityTypeCategoryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    );
  }

  async deleteActivityTypeCategory(activityTypeCategoryId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`activitytypecategories/${activityTypeCategoryId}`, {
      method: 'DELETE'
    });
  }

  async listCountries(limit?: number, page?: number): Promise<MonicaPaginatedResponse<MonicaCountry>> {
    return this.request<MonicaPaginatedResponse<MonicaCountry>>('countries', {
      searchParams: {
        limit,
        page
      }
    });
  }

  async listCurrencies(options: ListCurrenciesOptions = {}): Promise<MonicaPaginatedResponse<MonicaCurrency>> {
    const { limit, page } = options;
    return this.request<MonicaPaginatedResponse<MonicaCurrency>>('currencies', {
      searchParams: { limit, page }
    });
  }

  async listGenders(limit?: number, page?: number): Promise<MonicaPaginatedResponse<MonicaGender>> {
    return this.request<MonicaPaginatedResponse<MonicaGender>>('genders', {
      searchParams: {
        limit,
        page
      }
    });
  }

  async listOccupations(options: ListOccupationsOptions = {}): Promise<MonicaPaginatedResponse<MonicaOccupation>> {
    const { limit, page } = options;
    return this.request<MonicaPaginatedResponse<MonicaOccupation>>('occupations', {
      searchParams: { limit, page }
    });
  }

  async getGender(genderId: number): Promise<MonicaSingleResponse<MonicaGender>> {
    return this.request<MonicaSingleResponse<MonicaGender>>(`genders/${genderId}`);
  }

  async listContactFieldTypes(options: ListContactFieldTypesOptions = {}): Promise<MonicaPaginatedResponse<MonicaContactFieldType>> {
    return this.request<MonicaPaginatedResponse<MonicaContactFieldType>>('contactfieldtypes', {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getContactFieldType(contactFieldTypeId: number): Promise<MonicaSingleResponse<MonicaContactFieldType>> {
    return this.request<MonicaSingleResponse<MonicaContactFieldType>>(`contactfieldtypes/${contactFieldTypeId}`);
  }

  async createContactFieldType(payload: CreateContactFieldTypePayload): Promise<MonicaSingleResponse<MonicaContactFieldType>> {
    const body = buildContactFieldTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaContactFieldType>>('contactfieldtypes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateContactFieldType(
    contactFieldTypeId: number,
    payload: UpdateContactFieldTypePayload
  ): Promise<MonicaSingleResponse<MonicaContactFieldType>> {
    const body = buildContactFieldTypeRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaContactFieldType>>(`contactfieldtypes/${contactFieldTypeId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteContactFieldType(contactFieldTypeId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`contactfieldtypes/${contactFieldTypeId}`, {
      method: 'DELETE'
    });
  }

  async listContactFields(options: ListContactFieldsOptions): Promise<MonicaPaginatedResponse<MonicaContactField>> {
    if (!options.contactId) {
      throw new Error('contactId is required when listing contact fields.');
    }

    return this.request<MonicaPaginatedResponse<MonicaContactField>>(`contacts/${options.contactId}/contactfields`, {
      searchParams: {
        limit: options.limit,
        page: options.page
      }
    });
  }

  async getContactField(contactFieldId: number): Promise<MonicaSingleResponse<MonicaContactField>> {
    return this.request<MonicaSingleResponse<MonicaContactField>>(`contactfields/${contactFieldId}`);
  }

  async createContactField(payload: CreateContactFieldPayload): Promise<MonicaSingleResponse<MonicaContactField>> {
    const body = buildContactFieldRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaContactField>>('contactfields', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateContactField(
    contactFieldId: number,
    payload: UpdateContactFieldPayload
  ): Promise<MonicaSingleResponse<MonicaContactField>> {
    const body = buildContactFieldRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaContactField>>(`contactfields/${contactFieldId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteContactField(contactFieldId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`contactfields/${contactFieldId}`, {
      method: 'DELETE'
    });
  }


  async listGifts(options: { contactId?: number; limit?: number; page?: number } = {}): Promise<MonicaPaginatedResponse<MonicaGift>> {
    const { contactId, limit, page } = options;
    return this.request<MonicaPaginatedResponse<MonicaGift>>('gifts', {
      searchParams: {
        contact_id: contactId,
        limit,
        page
      }
    });
  }

  async getGift(giftId: number): Promise<MonicaSingleResponse<MonicaGift>> {
    return this.request<MonicaSingleResponse<MonicaGift>>(`gifts/${giftId}`);
  }

  async createGift(payload: CreateGiftPayload): Promise<MonicaSingleResponse<MonicaGift>> {
    return this.request<MonicaSingleResponse<MonicaGift>>('gifts', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: payload.contactId,
        received_on: payload.receivedOn,
        title: payload.title,
        description: payload.description ?? null,
        was_given_by_me: payload.wasGivenByMe ?? false,
        amount: payload.amount ?? null,
        currency_id: payload.currencyId ?? null
      })
    });
  }

  async updateGift(giftId: number, payload: UpdateGiftPayload): Promise<MonicaSingleResponse<MonicaGift>> {
    return this.request<MonicaSingleResponse<MonicaGift>>(`gifts/${giftId}`, {
      method: 'PUT',
      body: JSON.stringify({
        contact_id: payload.contactId,
        received_on: payload.receivedOn,
        title: payload.title,
        description: payload.description ?? null,
        was_given_by_me: payload.wasGivenByMe,
        amount: payload.amount ?? null,
        currency_id: payload.currencyId ?? null
      })
    });
  }

  async deleteGift(giftId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`gifts/${giftId}`, {
      method: 'DELETE'
    });
  }

  async listDebts(options: { contactId?: number; limit?: number; page?: number } = {}): Promise<MonicaPaginatedResponse<MonicaDebt>> {
    const { contactId, limit, page } = options;
    return this.request<MonicaPaginatedResponse<MonicaDebt>>('debts', {
      searchParams: {
        contact_id: contactId,
        limit,
        page
      }
    });
  }

  async getDebt(debtId: number): Promise<MonicaSingleResponse<MonicaDebt>> {
    return this.request<MonicaSingleResponse<MonicaDebt>>(`debts/${debtId}`);
  }

  async createDebt(payload: CreateDebtPayload): Promise<MonicaSingleResponse<MonicaDebt>> {
    return this.request<MonicaSingleResponse<MonicaDebt>>('debts', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: payload.contactId,
        description: payload.description ?? null,
        amount: payload.amount,
        currency_id: payload.currencyId ?? null,
        happened_at: payload.happenedAt,
        is_settled: payload.isSettled ?? false,
        settled_at: payload.settledAt ?? null
      })
    });
  }

  async updateDebt(debtId: number, payload: UpdateDebtPayload): Promise<MonicaSingleResponse<MonicaDebt>> {
    return this.request<MonicaSingleResponse<MonicaDebt>>(`debts/${debtId}`, {
      method: 'PUT',
      body: JSON.stringify({
        contact_id: payload.contactId,
        description: payload.description ?? null,
        amount: payload.amount,
        currency_id: payload.currencyId ?? null,
        happened_at: payload.happenedAt,
        is_settled: payload.isSettled,
        settled_at: payload.settledAt ?? null
      })
    });
  }

  async deleteDebt(debtId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`debts/${debtId}`, {
      method: 'DELETE'
    });
  }

  async listDocuments(options: { contactId?: number; limit?: number; page?: number } = {}): Promise<MonicaPaginatedResponse<MonicaDocument>> {
    const { contactId, limit, page } = options;

    if (contactId) {
      return this.request<MonicaPaginatedResponse<MonicaDocument>>(`contacts/${contactId}/documents`, {
        searchParams: { limit, page }
      });
    }

    return this.request<MonicaPaginatedResponse<MonicaDocument>>('documents', {
      searchParams: { limit, page }
    });
  }

  async getDocument(documentId: number): Promise<MonicaSingleResponse<MonicaDocument>> {
    return this.request<MonicaSingleResponse<MonicaDocument>>(`documents/${documentId}`);
  }

  async uploadDocument(payload: UploadDocumentPayload): Promise<MonicaSingleResponse<MonicaDocument>> {
    const formData = buildMediaFormData(payload, 'document');

    return this.request<MonicaSingleResponse<MonicaDocument>>('documents', {
      method: 'POST',
      body: formData
    });
  }

  async deleteDocument(documentId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  async listPhotos(options: { contactId?: number; limit?: number; page?: number } = {}): Promise<MonicaPaginatedResponse<MonicaPhoto>> {
    const { contactId, limit, page } = options;

    if (contactId) {
      return this.request<MonicaPaginatedResponse<MonicaPhoto>>(`contacts/${contactId}/photos`, {
        searchParams: { limit, page }
      });
    }

    return this.request<MonicaPaginatedResponse<MonicaPhoto>>('photos', {
      searchParams: { limit, page }
    });
  }

  async getPhoto(photoId: number): Promise<MonicaSingleResponse<MonicaPhoto>> {
    return this.request<MonicaSingleResponse<MonicaPhoto>>(`photos/${photoId}`);
  }

  async uploadPhoto(payload: UploadPhotoPayload): Promise<MonicaSingleResponse<MonicaPhoto>> {
    const formData = buildMediaFormData(payload, 'photo');

    return this.request<MonicaSingleResponse<MonicaPhoto>>('photos', {
      method: 'POST',
      body: formData
    });
  }

  async deletePhoto(photoId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`photos/${photoId}`, {
      method: 'DELETE'
    });
  }

  async listTags(limit?: number, page?: number): Promise<MonicaPaginatedResponse<MonicaTag>> {
    return this.request<MonicaPaginatedResponse<MonicaTag>>('tags', {
      searchParams: {
        limit,
        page
      }
    });
  }

  async getTag(tagId: number): Promise<MonicaSingleResponse<MonicaTag>> {
    return this.request<MonicaSingleResponse<MonicaTag>>(`tags/${tagId}`);
  }

  async createTag(payload: CreateTagPayload): Promise<MonicaSingleResponse<MonicaTag>> {
    const body = buildTagRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaTag>>('tags', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateTag(tagId: number, payload: UpdateTagPayload): Promise<MonicaSingleResponse<MonicaTag>> {
    const body = buildTagRequestBody(payload);
    return this.request<MonicaSingleResponse<MonicaTag>>(`tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteTag(tagId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`tags/${tagId}`, {
      method: 'DELETE'
    });
  }

  async createContact(profile: ContactProfileInput): Promise<MonicaSingleResponse<MonicaContact>> {
    const body = buildContactRequestBody(profile);
    return this.request<MonicaSingleResponse<MonicaContact>>('contacts', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateContact(contactId: number, profile: ContactProfileInput): Promise<MonicaSingleResponse<MonicaContact>> {
    const body = buildContactRequestBody(profile);
    return this.request<MonicaSingleResponse<MonicaContact>>(`contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteContact(contactId: number): Promise<MonicaDeleteResponse> {
    return this.request<MonicaDeleteResponse>(`contacts/${contactId}`, {
      method: 'DELETE'
    });
  }

  async fetchContactNotes(contactId: number, limit?: number, page?: number): Promise<MonicaPaginatedResponse<MonicaNote>> {
    return this.request<MonicaPaginatedResponse<MonicaNote>>(`contacts/${contactId}/notes`, {
      searchParams: {
        limit,
        page
      }
    });
  }

  async healthCheck(): Promise<void> {
    await this.request('contacts', { searchParams: { limit: 1 } });
  }

  private buildHeaders(additional?: HeadersInit, skipDefaultContentType = false): Headers {
    const headers = new Headers(additional);

    headers.set('Accept', 'application/json');

    if (!skipDefaultContentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    switch (this.options.tokenType) {
      case 'bearer':
        headers.set('Authorization', `Bearer ${this.options.token}`);
        break;
      case 'apiKey':
        headers.set('X-API-Key', this.options.token);
        break;
      case 'legacy':
        headers.set('X-Auth-Token', this.options.token);
        headers.set('X-User-Token', this.options.userToken ?? '');
        break;
    }

    headers.set('User-Agent', 'monica-crm-mcp/0.1');

    return headers;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.apiBaseUrl);

    if (options.searchParams) {
      for (const [key, value] of Object.entries(options.searchParams)) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, String(value));
      }
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), options.timeoutMs ?? this.defaultTimeoutMs);

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = this.buildHeaders(options.headers, isFormData);

    const requestInit: RequestInit = {
      ...options,
      headers,
      signal: abortController.signal
    };

    try {
      const response = await fetch(url, requestInit);
      const requestId = response.headers.get('x-request-id');
      const text = await response.text();
      const data = text ? deserializeJson(text) : undefined;

      if (!response.ok) {
        this.logger.warn(
          {
            status: response.status,
            requestId,
            url: url.toString(),
            body: scrubSecrets(data)
          },
          'Monica API request failed'
        );

        throw new MonicaApiError(
          `Monica API request to ${url.pathname} failed with status ${response.status}`,
          response.status,
          data,
          requestId
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof MonicaApiError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new Error(`Monica API request to ${url.pathname} timed out.`);
      }

      this.logger.error({ err: error, url: url.toString() }, 'Unexpected Monica API error');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function deserializeJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch (error) {
    // Monica occasionally returns empty bodies on 204s; surface the raw payload otherwise.
    return payload;
  }
}

function scrubSecrets(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubSecrets(entry));
  }

  const record: Record<string, unknown> = { ...(value as Record<string, unknown>) };

  for (const [key, v] of Object.entries(record)) {
    if (key.toLowerCase().includes('token')) {
      record[key] = '[redacted]';
      continue;
    }

    record[key] = scrubSecrets(v);
  }

  return record;
}

function buildMediaFormData(
  payload: UploadDocumentPayload | UploadPhotoPayload,
  fieldName: 'document' | 'photo'
): FormData {
  const formData = new FormData();

  if (payload.contactId != null) {
    formData.append('contact_id', String(payload.contactId));
  }

  const buffer = Buffer.from(payload.base64Data, 'base64');
  const blob = new Blob([buffer], {
    type: payload.mimeType ?? 'application/octet-stream'
  });

  formData.append(fieldName, blob, payload.fileName);

  return formData;
}

function buildActivityRequestBody(payload: CreateActivityPayload | UpdateActivityPayload): Record<string, unknown> {
  if (!payload.contactIds.length) {
    throw new Error('Provide at least one contact ID when creating or updating an activity.');
  }

  const body: Record<string, unknown> = {
    activity_type_id: payload.activityTypeId,
    summary: payload.summary,
    description: payload.description ?? null,
    happened_at: payload.happenedAt,
    contacts: payload.contactIds
  };

  if (payload.emotionIds && payload.emotionIds.length) {
    body.emotions = payload.emotionIds;
  }

  return body;
}

function buildAddressRequestBody(payload: CreateAddressPayload | UpdateAddressPayload): Record<string, unknown> {
  return {
    name: payload.name,
    street: toNull(payload.street),
    city: toNull(payload.city),
    province: toNull(payload.province),
    postal_code: toNull(payload.postalCode),
    country: payload.countryId ?? null,
    contact_id: payload.contactId
  };
}

function buildContactFieldTypeRequestBody(payload: CreateContactFieldTypePayload | UpdateContactFieldTypePayload) {
  return {
    name: payload.name,
    fontawesome_icon: toNull(payload.fontawesomeIcon),
    protocol: toNull(payload.protocol),
    delible: payload.delible === undefined ? undefined : payload.delible ? 1 : 0,
    type: toNull(payload.kind)
  };
}

function buildContactFieldRequestBody(payload: CreateContactFieldPayload | UpdateContactFieldPayload) {
  return {
    data: payload.data,
    contact_field_type_id: payload.contactFieldTypeId,
    contact_id: payload.contactId
  };
}

function buildActivityTypeRequestBody(payload: CreateActivityTypePayload | UpdateActivityTypePayload) {
  return {
    name: payload.name,
    activity_type_category_id: payload.categoryId,
    location_type: toNull(payload.locationType)
  };
}

function buildActivityTypeCategoryRequestBody(
  payload: CreateActivityTypeCategoryPayload | UpdateActivityTypeCategoryPayload
) {
  return {
    name: payload.name
  };
}

function buildTaskRequestBody(payload: CreateTaskPayload): Record<string, unknown> {
  return {
    title: payload.title,
    description: toNull(payload.description),
    completed: payload.status === 'completed' ? 1 : 0,
    completed_at: toNull(payload.completedAt),
    contact_id: payload.contactId
  };
}

function buildCallRequestBody(payload: CreateCallPayload): Record<string, unknown> {
  return {
    contact_id: payload.contactId,
    called_at: payload.calledAt,
    content: toNull(payload.content ?? null)
  };
}

function buildConversationCreateRequestBody(payload: CreateConversationPayload) {
  return {
    happened_at: payload.happenedAt,
    contact_field_type_id: payload.contactFieldTypeId,
    contact_id: payload.contactId
  };
}

function buildConversationUpdateRequestBody(payload: UpdateConversationPayload) {
  return {
    happened_at: payload.happenedAt
  };
}

function buildConversationMessageRequestBody(
  payload: CreateConversationMessagePayload | UpdateConversationMessagePayload
) {
  return {
    contact_id: payload.contactId,
    written_at: payload.writtenAt,
    written_by_me: payload.writtenByMe,
    content: payload.content
  };
}

function buildReminderRequestBody(payload: CreateReminderPayload): Record<string, unknown> {
  return {
    title: payload.title,
    description: toNull(payload.description ?? null),
    next_expected_date: payload.nextExpectedDate,
    frequency_type: payload.frequencyType,
    frequency_number: payload.frequencyNumber ?? null,
    contact_id: payload.contactId
  };
}

function buildRelationshipCreateRequestBody(payload: CreateRelationshipPayload) {
  return {
    contact_is: payload.contactIsId,
    relationship_type_id: payload.relationshipTypeId,
    of_contact: payload.ofContactId
  };
}

function buildRelationshipUpdateRequestBody(payload: UpdateRelationshipPayload) {
  return {
    relationship_type_id: payload.relationshipTypeId
  };
}

function buildRelationshipTypeRequestBody(
  payload: CreateRelationshipTypePayload | UpdateRelationshipTypePayload
) {
  return {
    name: payload.name,
    name_reverse_relationship: payload.reverseName,
    relationship_type_group_id: payload.relationshipTypeGroupId ?? null,
    delible:
      payload.delible === undefined ? undefined : payload.delible ? 1 : 0
  };
}

function buildRelationshipTypeGroupRequestBody(
  payload: CreateRelationshipTypeGroupPayload | UpdateRelationshipTypeGroupPayload
) {
  return {
    name: payload.name,
    delible: payload.delible === undefined ? undefined : payload.delible ? 1 : 0
  };
}

function buildGroupRequestBody(payload: CreateGroupPayload | UpdateGroupPayload) {
  return {
    name: payload.name
  };
}

function mergeCallPayload(existing: MonicaCall, patch: UpdateCallPayload): CreateCallPayload {
  const calledAt = patch.calledAt ?? (existing.called_at ? existing.called_at.slice(0, 10) : undefined);

  if (!calledAt) {
    throw new Error('calledAt is required to update a call.');
  }

  return {
    contactId: patch.contactId ?? existing.contact.id,
    calledAt,
    content: patch.content === undefined ? existing.content : patch.content
  };
}

function mergeReminderPayload(existing: MonicaReminder, patch: UpdateReminderPayload): CreateReminderPayload {
  const nextExpectedDate =
    patch.nextExpectedDate ?? (existing.next_expected_date ? existing.next_expected_date.slice(0, 10) : undefined);

  if (!nextExpectedDate) {
    throw new Error('nextExpectedDate is required to update a reminder.');
  }

  return {
    title: patch.title ?? existing.title,
    description: patch.description === undefined ? existing.description : patch.description,
    nextExpectedDate,
    frequencyType: patch.frequencyType ?? existing.frequency_type,
    frequencyNumber: patch.frequencyNumber ?? existing.frequency_number ?? null,
    contactId: patch.contactId ?? existing.contact.id
  };
}

function buildTagRequestBody(payload: CreateTagPayload | UpdateTagPayload) {
  return {
    name: payload.name
  };
}

function mergeTaskPayload(existing: MonicaTask, patch: UpdateTaskPayload): CreateTaskPayload {
  const contactId = patch.contactId ?? existing.contact?.id;
  if (!contactId) {
    throw new Error('contactId is required to update a task.');
  }

  return {
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description ?? null,
    status: patch.status ?? (existing.completed ? 'completed' : 'open'),
    completedAt: patch.completedAt ?? existing.completed_at ?? null,
    contactId
  };
}

function buildNoteRequestBody(existing: MonicaNote, patch: UpdateNotePayload) {
  const contactId = patch.contactId ?? existing.contact.id;
  if (!contactId) {
    throw new Error('contactId is required to update a note.');
  }

  return {
    contact_id: contactId,
    body: patch.body ?? existing.body,
    is_favorited: (patch.isFavorited ?? existing.is_favorited) ? 1 : 0
  };
}

function buildContactRequestBody(profile: ContactProfileInput): Record<string, unknown> {
  const birthdate = resolveBirthdate(profile.birthdate);
  const deceased = resolveDeceasedDate(profile.deceasedDate);

  return {
    first_name: profile.firstName,
    last_name: toNull(profile.lastName),
    nickname: toNull(profile.nickname),
    description: toNull(profile.description),
    gender_id: profile.genderId,
    is_partial: profile.isPartial ?? false,
    is_deceased: profile.isDeceased ?? false,
    is_birthdate_known: birthdate.isKnown,
    birthdate_is_age_based: birthdate.isAgeBased,
    birthdate_day: birthdate.day,
    birthdate_month: birthdate.month,
    birthdate_year: birthdate.year,
    birthdate_age: birthdate.age,
    is_deceased_date_known: deceased.isKnown,
    deceased_date_is_age_based: deceased.isAgeBased,
    deceased_date_day: deceased.day,
    deceased_date_month: deceased.month,
    deceased_date_year: deceased.year,
    deceased_date_age: deceased.age,
    deceased_date_is_year_unknown: deceased.isYearUnknown,
    deceased_date_add_reminder: profile.remindOnDeceasedDate ?? false
  };
}

interface ResolvedDateInfo {
  isKnown: boolean;
  isAgeBased: boolean;
  day: number | null;
  month: number | null;
  year: number | null;
  age: number | null;
  isYearUnknown: boolean;
}

function resolveBirthdate(input?: BirthdateInput): ResolvedDateInfo {
  if (!input || input.type === 'unknown') {
    return {
      isKnown: false,
      isAgeBased: false,
      day: null,
      month: null,
      year: null,
      age: null,
      isYearUnknown: false
    };
  }

  if (input.type === 'exact') {
    return {
      isKnown: true,
      isAgeBased: false,
      day: input.day,
      month: input.month,
      year: input.year,
      age: null,
      isYearUnknown: false
    };
  }

  return {
    isKnown: true,
    isAgeBased: true,
    day: null,
    month: null,
    year: null,
    age: input.age,
    isYearUnknown: false
  };
}

function resolveDeceasedDate(input?: DeceasedDateInput): ResolvedDateInfo {
  if (!input || input.type === 'unknown') {
    return {
      isKnown: false,
      isAgeBased: false,
      day: null,
      month: null,
      year: null,
      age: null,
      isYearUnknown: false
    };
  }

  if (input.type === 'exact') {
    return {
      isKnown: true,
      isAgeBased: false,
      day: input.day,
      month: input.month,
      year: input.year,
      age: null,
      isYearUnknown: false
    };
  }

  return {
    isKnown: true,
    isAgeBased: true,
    day: null,
    month: null,
    year: null,
    age: input.age,
    isYearUnknown: false
  };
}

function toNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}
