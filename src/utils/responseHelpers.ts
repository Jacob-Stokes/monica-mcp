/**
 * Shared response builders for MCP tool outputs.
 * These utilities standardize pagination, mutation receipts, and list summaries across all tools.
 */

import type { MonicaPaginatedResponse } from '../types.js';

/**
 * Standard pagination structure extracted from Monica API responses
 */
export interface PaginationInfo {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

/**
 * Extract pagination metadata from a Monica API response
 */
export function extractPagination<T>(response: MonicaPaginatedResponse<T>): PaginationInfo {
  return {
    currentPage: response.meta.current_page,
    lastPage: response.meta.last_page,
    perPage: response.meta.per_page,
    total: response.meta.total
  };
}

/**
 * Build a text content block for MCP tool responses
 */
export function textContent(text: string) {
  return {
    type: 'text' as const,
    text
  };
}

/**
 * Build a standard list response with pagination
 */
export function buildListResponse<T>(params: {
  items: T[];
  itemName: string;
  summaryText: string;
  structuredData: Record<string, any>;
  pagination?: PaginationInfo;
}) {
  return {
    content: [textContent(params.summaryText)],
    structuredContent: {
      ...params.structuredData,
      ...(params.pagination ? { pagination: params.pagination } : {})
    }
  };
}

/**
 * Build a standard "get single item" response
 */
export function buildGetResponse<T>(params: {
  item: T;
  summaryText: string;
  structuredData: Record<string, any>;
}) {
  return {
    content: [textContent(params.summaryText)],
    structuredContent: params.structuredData
  };
}

/**
 * Build a standard mutation response (create/update/delete)
 */
export function buildMutationResponse(params: {
  action: 'create' | 'update' | 'delete';
  summaryText: string;
  structuredData: Record<string, any>;
}) {
  return {
    content: [textContent(params.summaryText)],
    structuredContent: {
      action: params.action,
      ...params.structuredData
    }
  };
}

/**
 * Build an error response
 */
export function buildErrorResponse(message: string) {
  return {
    isError: true as const,
    content: [textContent(message)]
  };
}

/**
 * Generate a summary for a list of items
 */
export function generateListSummary(params: {
  count: number;
  itemName: string;
  itemNamePlural?: string;
  contextInfo?: string;
}) {
  const plural = params.itemNamePlural || `${params.itemName}s`;
  const itemLabel = params.count === 1 ? params.itemName : plural;
  const contextSuffix = params.contextInfo ? ` ${params.contextInfo}` : '';

  if (params.count === 0) {
    return `No ${plural} found${contextSuffix}.`;
  }

  return `Fetched ${params.count} ${itemLabel}${contextSuffix}.`;
}

/**
 * Generate a summary for a creation mutation
 */
export function generateCreateSummary(params: {
  itemName: string;
  itemId: number;
  itemLabel?: string;
  contextInfo?: string;
}) {
  const label = params.itemLabel || `#${params.itemId}`;
  const contextSuffix = params.contextInfo ? ` ${params.contextInfo}` : '';
  return `Created ${params.itemName} ${label} (ID ${params.itemId})${contextSuffix}.`;
}

/**
 * Generate a summary for an update mutation
 */
export function generateUpdateSummary(params: {
  itemName: string;
  itemId: number;
  itemLabel?: string;
  contextInfo?: string;
}) {
  const label = params.itemLabel || `#${params.itemId}`;
  const contextSuffix = params.contextInfo ? ` ${params.contextInfo}` : '';
  return `Updated ${params.itemName} ${label} (ID ${params.itemId})${contextSuffix}.`;
}

/**
 * Generate a summary for a delete mutation
 */
export function generateDeleteSummary(params: {
  itemName: string;
  itemId: number;
}) {
  return `Deleted ${params.itemName} ID ${params.itemId}.`;
}