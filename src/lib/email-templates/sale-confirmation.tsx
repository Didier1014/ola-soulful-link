import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailLogo } from './_logo'

interface SaleConfirmationProps {
  producerName?: string
  customerName?: string
  customerPhone?: string
  productName?: string
  amount?: string
  netAmount?: string
  transactionId?: string
  date?: string
}

const SaleConfirmationEmail = ({
  producerName = 'Produtor',
  customerName = 'Cliente',
  customerPhone = '',
  productName = '',
  amount = '0 MZN',
  netAmount = '0 MZN',
  transactionId = '',
  date = '',
}: SaleConfirmationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Nova venda aprovada — {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Nova venda aprovada!</Heading>
        <Text style={text}>
          Olá {producerName}, recebeste um novo pagamento via RedoxPay.
        </Text>

        <Section style={card}>
          <Text style={amountStyle}>{amount}</Text>
          <Text style={netLabel}>Valor líquido: <strong>{netAmount}</strong></Text>
        </Section>

        <Hr style={hr} />

        <Section>
          {productName ? <Text style={row}><strong>Produto:</strong> {productName}</Text> : null}
          <Text style={row}><strong>Cliente:</strong> {customerName}</Text>
          {customerPhone ? <Text style={row}><strong>Telefone:</strong> {customerPhone}</Text> : null}
          {transactionId ? <Text style={row}><strong>Transação:</strong> {transactionId}</Text> : null}
          {date ? <Text style={row}><strong>Data:</strong> {date}</Text> : null}
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          O valor já foi creditado no seu saldo RedoxPay e está disponível para saque.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SaleConfirmationEmail,
  subject: (data: Record<string, any>) => `✅ Venda aprovada — ${data.amount ?? ''}`,
  displayName: 'Venda aprovada (produtor)',
  previewData: {
    producerName: 'João',
    customerName: 'Maria Silva',
    customerPhone: '+258 84 000 0000',
    productName: 'Curso de Marketing',
    amount: '1.000,00 MZN',
    netAmount: '835,00 MZN',
    transactionId: 'tx_abc123',
    date: '17/06/2026 14:30',
  },
} satisfies TemplateEntry

export default SaleConfirmationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f4f5', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, margin: '0 0 16px' }
const amountStyle = { fontSize: '28px', fontWeight: 'bold' as const, color: '#16a34a', margin: '0 0 8px' }
const netLabel = { fontSize: '13px', color: '#555', margin: 0 }
const row = { fontSize: '14px', color: '#333', margin: '6px 0' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#888', margin: '20px 0 0' }
