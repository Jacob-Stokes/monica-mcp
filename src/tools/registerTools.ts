import type { ToolRegistrationContext } from './context.js';
import {
  registerSearchTools,
  registerContactTools,
  registerContactListTools,
  registerContactWrapperTools,
  registerContactFieldTypeTools,
  registerContactTagTools,
  registerActivityTypeTools,
  registerActivityTools,
  registerCommunicationTools,
  registerGroupTools,
  registerRelationshipTools,
  registerTagTools,
  registerNoteTools,
  registerMetadataTools,
  registerActionTools,
  registerFinancialTools,
  registerMediaTools
} from './modules/index.js';

export type { ToolRegistrationContext } from './context.js';

export function registerTools(context: ToolRegistrationContext): void {
  registerSearchTools(context);
  registerContactTools(context);
  registerContactListTools(context);
  registerContactWrapperTools(context);
  registerContactFieldTypeTools(context);
  registerContactTagTools(context);
  registerActivityTypeTools(context);
  registerActivityTools(context);
  registerCommunicationTools(context);
  registerGroupTools(context);
  registerRelationshipTools(context);
  registerTagTools(context);
  registerNoteTools(context);
  registerActionTools(context);
  registerFinancialTools(context);
  registerMediaTools(context);
  registerMetadataTools(context);
  registerSystemTools(context);
}

function registerSystemTools({ server, client }: ToolRegistrationContext): void {
  server.registerTool(
    'monica_health_check',
    {
      title: 'Test Monica connectivity',
      description: 'Verify that the configured Monica credentials work.'
    },
    async () => {
      await client.healthCheck();
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Successfully connected to Monica CRM API.'
          }
        ]
      };
    }
  );
}
