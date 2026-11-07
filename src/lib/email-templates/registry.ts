import type { ComponentType } from 'react'
import { template as saleConfirmationTemplate } from './sale-confirmation'
import { template as withdrawalStatusTemplate } from './withdrawal-status'
import { template as productApprovalTemplate } from './product-approval'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'sale-confirmation': saleConfirmationTemplate,
  'withdrawal-status': withdrawalStatusTemplate,
  'product-approval': productApprovalTemplate,
}
