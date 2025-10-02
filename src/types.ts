export interface MonicaPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface MonicaPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface MonicaPaginatedResponse<T> {
  data: T[];
  links: MonicaPaginationLinks;
  meta: MonicaPaginationMeta;
}

// Countries endpoint returns data as an object with ISO codes as keys, not an array
export interface MonicaCountriesResponse {
  data: Record<string, MonicaCountry>;
  links: MonicaPaginationLinks;
  meta: MonicaPaginationMeta;
}

export interface MonicaContactInformation {
  dates?: Array<{
    name: string;
    birthdate?: string;
    is_birthdate_approximate?: string | null;
    type?: string | null;
  }>;
  emails?: Array<{
    value: string;
    type?: string | null;
  }>;
  phones?: Array<{
    value: string;
    type?: string | null;
  }>;
  addresses?: Array<{
    city?: string | null;
    country?: string | null;
    state?: string | null;
    street?: string | null;
    postal_code?: string | null;
  }>;
  description?: string | null;
}

export interface MonicaContact {
  id: number;
  object: 'contact';
  first_name: string;
  last_name: string | null;
  nickname?: string | null;
  gender?: string | null;
  is_partial: boolean;
  account: { id: number };
  information?: MonicaContactInformation;
  created_at?: string;
  updated_at?: string;
  contactFields?: MonicaContactField[];
  tags?: MonicaTag[];
}

export interface MonicaTask {
  id: number;
  object: 'task';
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  account: { id: number };
  contact?: MonicaContact;
  due_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonicaNote {
  id: number;
  object: 'note';
  body: string;
  is_favorited: boolean;
  favorited_at: string | null;
  account: { id: number };
  contact: MonicaContact;
  created_at: string;
  updated_at: string;
}

export interface MonicaSingleResponse<T> {
  data: T;
}

export interface MonicaDeleteResponse {
  deleted: boolean;
  id: number;
}

export interface MonicaCountry {
  id: string;
  object: 'country';
  name: string;
  iso: string;
}

export interface MonicaGender {
  id: number;
  object: 'gender';
  name: string;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaRelationshipType {
  id: number;
  object: 'relationshiptype';
  name: string;
  name_reverse_relationship: string;
  relationship_type_group_id: number | null;
  delible: boolean | number;
  account: { id: number };
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaRelationship {
  id: number;
  object: 'relationship';
  contact_is: MonicaContact;
  relationship_type: MonicaRelationshipType;
  of_contact: MonicaContact;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaGroup {
  id: number;
  object: 'group';
  name: string;
  contacts: MonicaContact[];
  account: { id: number };
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaConversationMessage {
  id: number;
  object: 'message';
  content: string;
  written_at: string | null;
  written_by_me: boolean;
  account: { id: number };
  contact: MonicaContact;
  conversation: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaConversation {
  id: number;
  object: 'conversation';
  happened_at: string | null;
  messages: MonicaConversationMessage[];
  contact_field_type: MonicaContactFieldType;
  account: { id: number };
  contact: MonicaContact;
  created_at: string;
  updated_at: string;
}

export interface MonicaCall {
  id: number;
  object: 'call';
  called_at: string | null;
  content: string | null;
  account: { id: number };
  contact: MonicaContact;
  created_at: string;
  updated_at: string;
}


export interface MonicaGift {
  id: number;
  object: 'gift';
  title: string;
  description: string | null;
  received_on: string;
  was_given_by_me: boolean;
  amount: number | null;
  currency: MonicaCurrency | null;
  contact: MonicaContact;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaDebt {
  id: number;
  object: 'debt';
  description: string | null;
  amount: number;
  currency: MonicaCurrency | null;
  happened_at: string;
  settled: boolean;
  settled_at: string | null;
  contact: MonicaContact;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaDocument {
  id: number;
  object: 'document';
  original_filename: string;
  new_filename: string;
  filesize: number;
  type: string | null;
  mime_type: string | null;
  number_of_downloads?: number;
  link: string;
  account: { id: number };
  contact: MonicaContact | null;
  created_at: string;
  updated_at: string;
}

export interface MonicaPhoto {
  id: number;
  object: 'photo';
  original_filename: string;
  new_filename: string;
  filesize: number;
  mime_type: string | null;
  link: string;
  account: { id: number };
  contact: MonicaContact | null;
  created_at: string;
  updated_at: string;
}

export interface MonicaReminder {
  id: number;
  object: 'reminder';
  title: string;
  description: string | null;
  frequency_type: 'one_time' | 'day' | 'week' | 'month' | 'year';
  frequency_number: number | null;
  last_triggered_date: string | null;
  next_expected_date: string | null;
  account: { id: number };
  contact: MonicaContact;
  created_at: string;
  updated_at: string;
}

export interface MonicaRelationshipTypeGroup {
  id: number;
  object: 'relationshiptypegroup';
  name: string;
  delible: boolean | number;
  account: { id: number };
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaAddress {
  id: number;
  object: 'address';
  name: string;
  street: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: MonicaCountry | null;
  account: { id: number };
  contact: MonicaContact;
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaContactFieldType {
  id: number;
  object: 'contactfieldtype';
  name: string;
  fontawesome_icon: string | null;
  protocol: string | null;
  delible: boolean | number;
  type: string | null;
  account: { id: number };
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaContactField {
  id: number;
  object: 'contactfield';
  data: string;
  contact_field_type: MonicaContactFieldType;
  account: { id: number };
  contact: MonicaContact;
  created_at: string | null;
  updated_at: string | null;
}

export interface MonicaActivityTypeCategory {
  id: number;
  object: 'activityTypeCategory';
  name: string;
  account?: { id: number };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MonicaActivityType {
  id: number;
  object: 'activityType';
  name: string;
  location_type: string | null;
  activity_type_category: MonicaActivityTypeCategory | null;
  account?: { id: number };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MonicaActivityContactSummary extends MonicaContact {
  hash_id?: string;
  complete_name?: string;
  initials?: string;
}

export interface MonicaActivityAttendees {
  total: number;
  contacts: MonicaActivityContactSummary[];
}

export interface MonicaActivity {
  id: number;
  object: 'activity';
  summary: string;
  description: string | null;
  happened_at: string;
  activity_type: MonicaActivityType | null;
  attendees: MonicaActivityAttendees;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaTag {
  id: number;
  object: 'tag';
  name: string;
  name_slug: string;
  account: { id: number };
  created_at: string;
  updated_at: string;
}

export interface MonicaCurrency {
  id: number;
  object: 'currency';
  iso: string;
  name: string;
  symbol: string | null;
}

export interface MonicaOccupationCompany {
  id: number;
  object: 'company';
  name: string | null;
  website?: string | null;
  number_of_employees?: number | null;
}

export interface MonicaOccupation {
  id: number;
  object: 'occupation';
  title: string;
  description: string | null;
  salary: number | null;
  salary_unit: string | null;
  currently_works_here: boolean;
  start_date: string | null;
  end_date: string | null;
  company: MonicaOccupationCompany | null;
  created_at: string;
  updated_at: string;
}
