// zod → JSON Schema converter, tuned for MCP tool input_schema semantics.
//
// Some MCP clients reject oneOf/anyOf/allOf at the top level of a tool's
// input schema. Discriminated unions (common for multi-action tools) flatten
// into a single object with the discriminator as a required enum and all
// other fields optional. Runtime zod validation still enforces correct
// action→field combinations, so type safety is preserved.

import type { z } from "zod";

export function zodToJsonSchema(schema: z.ZodType): any {
  const def: any = (schema as any)._def;

  if (def.typeName === "ZodObject") {
    const shape = def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = zodToJsonSchema(v as z.ZodType);
      if (!(v as any).isOptional?.() && !isDefaulted(v as z.ZodType)) required.push(k);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }

  if (def.typeName === "ZodDiscriminatedUnion") {
    const discriminator: string = def.discriminator;
    const discriminatorValues: string[] = [];
    const allProperties: Record<string, any> = {};
    // A field every action requires (e.g. vault_id) stays required after
    // flattening, so clients see it as mandatory rather than optional.
    let commonRequired: Set<string> | null = null;
    for (const opt of def.options as z.ZodObject<any>[]) {
      const shape = ((opt as any)._def.shape)();
      const required = new Set<string>(
        Object.entries(shape)
          .filter(([, v]) => !(v as any).isOptional?.() && !isDefaulted(v as z.ZodType))
          .map(([k]) => k),
      );
      const previous: Set<string> | null = commonRequired;
      commonRequired = previous === null ? required : new Set<string>([...previous].filter((k: string) => required.has(k)));
      for (const [k, v] of Object.entries(shape)) {
        if (k === discriminator) {
          const litDef = (v as any)._def;
          if (litDef?.typeName === "ZodLiteral") discriminatorValues.push(litDef.value);
          continue;
        }
        if (!(k in allProperties)) {
          allProperties[k] = zodToJsonSchema(v as z.ZodType);
        }
      }
    }
    allProperties[discriminator] = {
      type: "string",
      enum: discriminatorValues,
      description:
        "Which operation to perform. Other fields are required/optional depending on the value chosen — see tool description.",
    };
    return {
      type: "object",
      properties: allProperties,
      required: [discriminator, ...[...((commonRequired as Set<string> | null) ?? [])].filter((k: string) => k !== discriminator)],
      additionalProperties: false,
    };
  }

  if (def.typeName === "ZodUnion") return zodToJsonSchema(def.options[0]);
  if (def.typeName === "ZodArray") {
    const out: any = { type: "array", items: zodToJsonSchema(def.type) };
    if (def.minLength?.value !== undefined) out.minItems = def.minLength.value;
    if (def.maxLength?.value !== undefined) out.maxItems = def.maxLength.value;
    if (def.description) out.description = def.description;
    return out;
  }
  if (def.typeName === "ZodRecord") {
    const out: any = { type: "object", additionalProperties: zodToJsonSchema(def.valueType) };
    if (def.description) out.description = def.description;
    return out;
  }
  if (def.typeName === "ZodEnum") {
    const out: any = { type: "string", enum: def.values };
    if (def.description) out.description = def.description;
    return out;
  }
  if (def.typeName === "ZodLiteral") return { const: def.value };

  if (def.typeName === "ZodString") {
    const s: any = { type: "string" };
    for (const check of def.checks ?? []) {
      if (check.kind === "min") s.minLength = check.value;
      if (check.kind === "max") s.maxLength = check.value;
      if (check.kind === "regex") s.pattern = check.regex.source;
    }
    if (def.description) s.description = def.description;
    return s;
  }
  if (def.typeName === "ZodNumber") {
    const out: any = { type: "number" };
    for (const check of def.checks ?? []) {
      if (check.kind === "int") out.type = "integer";
      if (check.kind === "min") out.minimum = check.value;
      if (check.kind === "max") out.maximum = check.value;
    }
    if (def.description) out.description = def.description;
    return out;
  }
  if (def.typeName === "ZodBoolean") {
    return { type: "boolean", ...(def.description ? { description: def.description } : {}) };
  }
  if (def.typeName === "ZodOptional") return zodToJsonSchema(def.innerType);
  if (def.typeName === "ZodNullable") return { ...zodToJsonSchema(def.innerType), nullable: true };
  if (def.typeName === "ZodDefault") {
    const inner = zodToJsonSchema(def.innerType);
    inner.default = def.defaultValue();
    return inner;
  }

  if (def.typeName === "ZodUnknown" || def.typeName === "ZodAny") return {};

  return {};
}

export function isDefaulted(v: z.ZodType): boolean {
  return (v as any)._def?.typeName === "ZodDefault" || (v as any)._def?.typeName === "ZodOptional";
}
