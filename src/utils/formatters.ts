import type {
  MonicaActivity,
  MonicaActivityType,
  MonicaActivityTypeCategory,
  MonicaAddress,
  MonicaContact,
  MonicaContactField,
  MonicaContactFieldType,
  MonicaCountry,
  MonicaCurrency,
  MonicaDebt,
  MonicaGender,
  MonicaGift,
  MonicaGroup,
  MonicaDocument,
  MonicaOccupation,
  MonicaReminder,
  MonicaRelationship,
  MonicaRelationshipType,
  MonicaRelationshipTypeGroup,
  MonicaNote,
  MonicaTask,
  MonicaTag,
  MonicaConversation,
  MonicaConversationMessage,
  MonicaCall,
  MonicaPhoto
} from '../types.js';

export function normalizeContactSummary(contact: MonicaContact) {
  return {
    id: contact.id,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim(),
    nickname: contact.nickname ?? undefined,
    gender: contact.gender ?? undefined,
    emails: contact.information?.emails?.map((email) => email.value) ?? [],
    phones: contact.information?.phones?.map((phone) => phone.value) ?? [],
    isPartial: contact.is_partial
  };
}

export function normalizeContactDetail(contact: MonicaContact) {
  const rawContactFields = getContactFields(contact);
  return {
    ...normalizeContactSummary(contact),
    description: contact.information?.description ?? undefined,
    dates: contact.information?.dates ?? [],
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
    customFields: rawContactFields.map(normalizeContactField),
    tags: contact.tags ? contact.tags.map(normalizeTag) : []
  };
}

export function buildContactSummary(contact: MonicaContact): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  const emails = contact.information?.emails?.map((email) => email.value) ?? [];
  const phones = contact.information?.phones?.map((phone) => phone.value) ?? [];
  const rawContactFields = getContactFields(contact);

  const parts = [name || `Contact #${contact.id}`];
  if (emails.length) {
    parts.push(`Emails: ${emails.join(', ')}`);
  }
  if (phones.length) {
    parts.push(`Phones: ${phones.join(', ')}`);
  }

  // Include contact fields if available
  if (rawContactFields.length > 0) {
    const fieldLines = rawContactFields.map((field) => {
      const typeName = field.contact_field_type?.name || 'Unknown';
      const value = field.data ?? '';
      return `${typeName}: ${value}`;
    });
    parts.push(`Contact Fields:\n  ${fieldLines.join('\n  ')}`);
  }

  if (contact.information?.description) {
    parts.push(`Notes: ${contact.information.description}`);
  }

  if (contact.tags && contact.tags.length) {
    const tagNames = contact.tags.map((tag) => tag.name).join(', ');
    parts.push(`Tags: ${tagNames}`);
  }

  return parts.join('\n');
}

function getContactFields(contact: MonicaContact): MonicaContactField[] {
  const candidate = (contact as MonicaContact & {
    contactfields?: MonicaContactField[];
  }).contactFields;

  if (candidate && Array.isArray(candidate)) {
    return candidate;
  }

  const legacy = (contact as { contactfields?: MonicaContactField[] }).contactfields;
  if (legacy && Array.isArray(legacy)) {
    return legacy;
  }

  return [];
}

export function normalizeTask(task: MonicaTask) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    completed: task.completed,
    status: task.completed ? 'completed' : 'open',
    completedAt: task.completed_at ?? undefined,
    dueAt: task.due_at ?? undefined,
    contactId: task.contact?.id,
    contact: task.contact ? normalizeContactSummary(task.contact) : undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };
}

export function normalizeNote(note: MonicaNote) {
  return {
    id: note.id,
    body: note.body,
    isFavorited: note.is_favorited,
    favoritedAt: note.favorited_at ?? undefined,
    contactId: note.contact.id,
    contact: normalizeContactSummary(note.contact),
    createdAt: note.created_at,
    updatedAt: note.updated_at
  };
}

export function normalizeActivity(activity: MonicaActivity) {
  return {
    id: activity.id,
    summary: activity.summary,
    description: activity.description ?? undefined,
    happenedAt: activity.happened_at,
    activityType: activity.activity_type
      ? {
          id: activity.activity_type.id,
          name: activity.activity_type.name,
          locationType: activity.activity_type.location_type,
          category: activity.activity_type.activity_type_category?.name ?? null
        }
      : null,
    attendees: activity.attendees.contacts.map((contact) => normalizeContactSummary(contact)),
    attendeeCount: activity.attendees.total,
    createdAt: activity.created_at,
    updatedAt: activity.updated_at
  };
}

export function normalizeAddress(address: MonicaAddress) {
  return {
    id: address.id,
    name: address.name,
    street: address.street ?? undefined,
    city: address.city ?? undefined,
    province: address.province ?? undefined,
    postalCode: address.postal_code ?? undefined,
    country: address.country
      ? {
          id: address.country.id,
          name: address.country.name,
          iso: address.country.iso
        }
      : null,
    contact: normalizeContactSummary(address.contact),
    createdAt: address.created_at ?? undefined,
    updatedAt: address.updated_at ?? undefined
  };
}

export function normalizeContactFieldType(type: MonicaContactFieldType) {
  return {
    id: type.id,
    name: type.name,
    icon: type.fontawesome_icon ?? undefined,
    protocol: type.protocol ?? undefined,
    delible: typeof type.delible === 'boolean' ? type.delible : type.delible === 1,
    kind: type.type ?? undefined,
    createdAt: type.created_at ?? undefined,
    updatedAt: type.updated_at ?? undefined
  };
}

export function normalizeContactField(field: MonicaContactField) {
  return {
    id: field.id,
    value: field.data,
    type: normalizeContactFieldType(field.contact_field_type),
    contactId: field.contact.id,
    createdAt: field.created_at ?? undefined,
    updatedAt: field.updated_at ?? undefined
  };
}

export function normalizeActivityType(activityType: MonicaActivityType) {
  return {
    id: activityType.id,
    name: activityType.name,
    locationType: activityType.location_type ?? undefined,
    category: activityType.activity_type_category
      ? normalizeActivityTypeCategory(activityType.activity_type_category)
      : null,
    createdAt: activityType.created_at ?? undefined,
    updatedAt: activityType.updated_at ?? undefined
  };
}

export function normalizeActivityTypeCategory(category: MonicaActivityTypeCategory) {
  return {
    id: category.id,
    name: category.name,
    createdAt: category.created_at ?? undefined,
    updatedAt: category.updated_at ?? undefined
  };
}

export function normalizeCountry(country: MonicaCountry) {
  return {
    id: country.id,
    name: country.name,
    iso: country.iso
  };
}

export function normalizeGender(gender: MonicaGender) {
  return {
    id: gender.id,
    name: gender.name,
    createdAt: gender.created_at ?? undefined,
    updatedAt: gender.updated_at ?? undefined
  };
}

export function normalizeRelationshipType(type: MonicaRelationshipType) {
  return {
    id: type.id,
    name: type.name,
    reverseName: type.name_reverse_relationship,
    groupId: type.relationship_type_group_id ?? undefined,
    isDeletable: Boolean(type.delible),
    createdAt: type.created_at ?? undefined,
    updatedAt: type.updated_at ?? undefined
  };
}

export function normalizeRelationship(relationship: MonicaRelationship) {
  return {
    id: relationship.id,
    contactId: relationship.contact_is.id,
    contact: normalizeContactSummary(relationship.contact_is),
    relatedContactId: relationship.of_contact.id,
    relatedContact: normalizeContactSummary(relationship.of_contact),
    relationshipType: normalizeRelationshipType(relationship.relationship_type),
    createdAt: relationship.created_at,
    updatedAt: relationship.updated_at
  };
}

export function normalizeGroup(group: MonicaGroup) {
  return {
    id: group.id,
    name: group.name,
    contactCount: group.contacts.length,
    contacts: group.contacts.map(normalizeContactSummary),
    createdAt: group.created_at ?? undefined,
    updatedAt: group.updated_at ?? undefined
  };
}

export function normalizeReminder(reminder: MonicaReminder) {
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description ?? undefined,
    frequencyType: reminder.frequency_type,
    frequencyNumber: reminder.frequency_number ?? undefined,
    lastTriggeredDate: reminder.last_triggered_date ?? undefined,
    nextExpectedDate: reminder.next_expected_date ?? undefined,
    contactId: reminder.contact.id,
    contact: normalizeContactSummary(reminder.contact),
    createdAt: reminder.created_at,
    updatedAt: reminder.updated_at
  };
}

export function normalizeRelationshipTypeGroup(group: MonicaRelationshipTypeGroup) {
  return {
    id: group.id,
    name: group.name,
    isDeletable: Boolean(group.delible),
    createdAt: group.created_at ?? undefined,
    updatedAt: group.updated_at ?? undefined
  };
}

export function normalizeConversationMessage(message: MonicaConversationMessage) {
  return {
    id: message.id,
    content: message.content,
    writtenAt: message.written_at ?? undefined,
    writtenByMe: message.written_by_me,
    contactId: message.contact.id,
    contact: normalizeContactSummary(message.contact),
    createdAt: message.created_at,
    updatedAt: message.updated_at
  };
}

export function normalizeConversation(conversation: MonicaConversation) {
  return {
    id: conversation.id,
    happenedAt: conversation.happened_at ?? undefined,
    contactId: conversation.contact.id,
    contact: normalizeContactSummary(conversation.contact),
    channel: normalizeContactFieldType(conversation.contact_field_type),
    messages: conversation.messages.map(normalizeConversationMessage),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at
  };
}

export function normalizeCall(call: MonicaCall) {
  return {
    id: call.id,
    contactId: call.contact.id,
    contact: normalizeContactSummary(call.contact),
    calledAt: call.called_at ?? undefined,
    content: call.content ?? undefined,
    createdAt: call.created_at,
    updatedAt: call.updated_at
  };
}

export function normalizeTag(tag: MonicaTag) {
  return {
    id: tag.id,
    name: tag.name,
    nameSlug: tag.name_slug,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at
  };
}


export function normalizeCurrency(currency: MonicaCurrency) {
  return {
    id: currency.id,
    iso: currency.iso,
    name: currency.name,
    symbol: currency.symbol ?? undefined
  };
}

export function normalizeOccupation(occupation: MonicaOccupation) {
  return {
    id: occupation.id,
    title: occupation.title,
    description: occupation.description ?? undefined,
    salary: occupation.salary ?? undefined,
    salaryUnit: occupation.salary_unit ?? undefined,
    currentlyWorksHere: occupation.currently_works_here,
    startDate: occupation.start_date ?? undefined,
    endDate: occupation.end_date ?? undefined,
    company: occupation.company
      ? {
          id: occupation.company.id,
          name: occupation.company.name ?? undefined,
          website: occupation.company.website ?? undefined,
          numberOfEmployees: occupation.company.number_of_employees ?? undefined
        }
      : null,
    createdAt: occupation.created_at,
    updatedAt: occupation.updated_at
  };
}

export function normalizeGift(gift: MonicaGift) {
  return {
    id: gift.id,
    title: gift.title,
    description: gift.description ?? undefined,
    receivedOn: gift.received_on,
    wasGivenByMe: gift.was_given_by_me,
    amount: gift.amount ?? undefined,
    currency: gift.currency ? normalizeCurrency(gift.currency) : null,
    contact: normalizeContactSummary(gift.contact),
    createdAt: gift.created_at,
    updatedAt: gift.updated_at
  };
}

export function normalizeDebt(debt: MonicaDebt) {
  return {
    id: debt.id,
    description: debt.description ?? undefined,
    amount: debt.amount,
    currency: debt.currency ? normalizeCurrency(debt.currency) : null,
    happenedAt: debt.happened_at,
    settled: debt.settled,
    settledAt: debt.settled_at ?? undefined,
    contact: normalizeContactSummary(debt.contact),
    createdAt: debt.created_at,
    updatedAt: debt.updated_at
  };
}

export function normalizeDocument(document: MonicaDocument) {
  return {
    id: document.id,
    originalFilename: document.original_filename,
    storedFilename: document.new_filename,
    filesize: document.filesize,
    type: document.type ?? undefined,
    mimeType: document.mime_type ?? undefined,
    downloadCount: document.number_of_downloads ?? undefined,
    downloadUrl: document.link,
    contact: document.contact ? normalizeContactSummary(document.contact) : undefined,
    createdAt: document.created_at,
    updatedAt: document.updated_at
  };
}

export function normalizePhoto(photo: MonicaPhoto) {
  return {
    id: photo.id,
    originalFilename: photo.original_filename,
    storedFilename: photo.new_filename,
    filesize: photo.filesize,
    mimeType: photo.mime_type ?? undefined,
    downloadUrl: photo.link,
    contact: photo.contact ? normalizeContactSummary(photo.contact) : undefined,
    createdAt: photo.created_at,
    updatedAt: photo.updated_at
  };
}
