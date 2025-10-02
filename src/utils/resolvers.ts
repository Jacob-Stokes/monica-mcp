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

export async function resolveGenderNameById(
  client: MonicaClient,
  genderId: number
): Promise<string> {
  let page = 1;

  while (true) {
    const response = await client.listGenders(100, page);
    const match = response.data.find((gender) => gender.id === genderId);
    if (match) {
      return match.name;
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  throw new Error(`No gender matched ID ${genderId}.`);
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
    const response = await client.listCountries(100, page);

    // Monica's countries endpoint returns data as an object with ISO codes as keys,
    // not as an array like other endpoints
    const countries = Object.values(response.data);

    const match = countries.find((country) => {
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
  const suggestions = new Map<string, string>();

  while (true) {
    const response = await client.listActivityTypes({ limit: 100, page });
    const match = response.data.find((type) => normalizeLookupValue(type.name) === target);

    if (match) {
      return match.id;
    }

    for (const type of response.data) {
      const normalizedName = normalizeLookupValue(type.name);
      if (
        normalizedName.includes(target) ||
        target.includes(normalizedName) ||
        type.name.toLowerCase().includes(target)
      ) {
        suggestions.set(type.name, type.name);
      }
    }

    if (response.meta.current_page >= response.meta.last_page) {
      break;
    }

    page += 1;
  }

  const suggestionList = Array.from(suggestions.values()).slice(0, 5);
  const suggestionText = suggestionList.length
    ? ` Similar activity types available: ${suggestionList.join(', ')}.`
    : '';
  const guidance =
    ' Use `monica_browse_metadata` or `monica_manage_activity_type` to review valid activity type names.';

  throw new Error(`No activity type matched "${activityTypeName}".${suggestionText}${guidance}`);
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
