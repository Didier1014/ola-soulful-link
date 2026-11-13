import type { ComponentType } from 'react'
import { template as saleConfirmationTemplate } from './sale-confirmation'
import { template as withdrawalStatusTemplate } from './withdrawal-status'
import { template as productApprovalTemplate } from './product-approval'
import { template as welcomeTemplate, testTemplate } from './account-welcome'
import { template as productDeliveryTemplate } from './product-delivery'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'account-welcome': welcomeTemplate,
  'email-test': testTemplate,
  'product-delivery': productDeliveryTemplate,
  'sale-confirmation': saleConfirmationTemplate,
  'withdrawal-status': withdrawalStatusTemplate,
  'product-approval': productApprovalTemplate,
}
