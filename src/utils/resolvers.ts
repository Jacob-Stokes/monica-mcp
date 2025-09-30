import type { MonicaClient } from '../client/MonicaClient.js';

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

export async function resolveGenderId(
  client: MonicaClient,
  genderId?: number,
  genderName?: string
): Promise<number | undefined> {
  if (typeof genderId === 'number') {
    return genderId;
  }

  if (!genderName) {
    // Gender is now optional - return undefined if not provided
    return undefined;
  }

  const target = normalizeLookupValue(genderName);
  let page = 1;

  while (true) {
    const response = await client.listGenders(100, page);
    const match = response.data.find((gender) => normalizeLookupValue(gender.name) === target);
    if (match) {
      return match.id;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  throw new Error(`No gender matched "${genderName}". If Monica requires a gender, please provide either genderId or genderName with a valid gender (e.g., "Male", "Female", "Rather not say").`);
}

export async function resolveCountryId(
  client: MonicaClient,
  options: {
    countryId?: string | null;
    countryIso?: string | null;
    countryName?: string | null;
  }
): Promise<string | null> {
  const { countryId, countryIso, countryName } = options;

  if (countryId) {
    return countryId;
  }

  const iso = countryIso?.trim();
  const name = countryName?.trim();

  if (!iso && !name) {
    return null;
  }

  const targetIso = iso?.toLowerCase();
  const targetName = name?.toLowerCase();
  let page = 1;

  while (true) {
    const response = await client.listCountries(250, page);
    const match = response.data.find((country) => {
      if (targetIso && country.iso?.toLowerCase() === targetIso) {
        return true;
      }

      if (targetName && country.name?.toLowerCase() === targetName) {
        return true;
      }

      return false;
    });

    if (match) {
      return match.id;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  if (iso) {
    throw new Error(`No country matched ISO code "${countryIso}".`);
  }

  throw new Error(`No country matched name "${countryName}".`);
}

export async function resolveContactFieldTypeId(
  client: MonicaClient,
  options: {
    contactFieldTypeId?: number;
    contactFieldTypeName?: string;
  }
): Promise<number> {
  const { contactFieldTypeId, contactFieldTypeName } = options;

  if (typeof contactFieldTypeId === 'number') {
    return contactFieldTypeId;
  }

  if (!contactFieldTypeName) {
    throw new Error('Provide contactFieldTypeId or contactFieldTypeName.');
  }

  const target = normalizeLookupValue(contactFieldTypeName);
  let page = 1;

  while (true) {
    const response = await client.listContactFieldTypes({ limit: 100, page });
    const match = response.data.find((type) => normalizeLookupValue(type.name) === target);

    if (match) {
      return match.id;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  throw new Error(`No contact field type matched "${contactFieldTypeName}".`);
}

export async function resolveActivityTypeId(
  client: MonicaClient,
  options: {
    activityTypeId?: number;
    activityTypeName?: string;
  }
): Promise<number> {
  const { activityTypeId, activityTypeName } = options;

  if (typeof activityTypeId === 'number') {
    return activityTypeId;
  }

  if (!activityTypeName) {
    throw new Error('Provide activityTypeId or activityTypeName.');
  }

  const target = normalizeLookupValue(activityTypeName);
  let page = 1;

  while (true) {
    const response = await client.listActivityTypes({ limit: 100, page });
    const match = response.data.find((type) => normalizeLookupValue(type.name) === target);

    if (match) {
      return match.id;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  throw new Error(`No activity type matched "${activityTypeName}".`);
}

export async function resolveRelationshipTypeId(
  client: MonicaClient,
  options: {
    relationshipTypeId?: number;
    relationshipTypeName?: string;
  }
): Promise<number> {
  const { relationshipTypeId, relationshipTypeName } = options;

  if (typeof relationshipTypeId === 'number') {
    return relationshipTypeId;
  }

  if (!relationshipTypeName) {
    throw new Error('Provide relationshipTypeId or relationshipTypeName.');
  }

  const target = normalizeLookupValue(relationshipTypeName);
  let page = 1;

  while (true) {
    const response = await client.listRelationshipTypes({ limit: 100, page });
    const match = response.data.find((type) => normalizeLookupValue(type.name) === target);

    if (match) {
      return match.id;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  throw new Error(`No relationship type matched "${relationshipTypeName}".`);
}
