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

interface WithdrawalStatusProps {
  userName?: string
  amount?: string
  status?: 'paid' | 'rejected'
  reason?: string
  date?: string
}

const WithdrawalStatusEmail = ({
  userName = 'Utilizador',
  amount = '0 MZN',
  status = 'paid',
  reason = '',
  date = '',
}: WithdrawalStatusProps) => {
  const paid = status === 'paid'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{paid ? `Saque pago — ${amount}` : `Saque rejeitado — ${amount}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailLogo />
          <Heading style={h1}>{paid ? '✅ Saque processado' : '⚠️ Saque rejeitado'}</Heading>
          <Text style={text}>
            Olá {userName},{' '}
            {paid
              ? 'o seu pedido de saque foi processado com sucesso.'
              : 'o seu pedido de saque foi rejeitado.'}
          </Text>

          <Section style={card}>
            <Text style={amountStyle}>{amount}</Text>
            <Text style={netLabel}>
              Estado: <strong>{paid ? 'Pago' : 'Rejeitado'}</strong>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            {date ? <Text style={row}><strong>Data:</strong> {date}</Text> : null}
            {!paid && reason ? <Text style={row}><strong>Motivo:</strong> {reason}</Text> : null}
          </Section>

          <Text style={footer}>
            RedoxPay — Pagamentos digitais em Moçambique
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WithdrawalStatusEmail,
  subject: (d: Record<string, any>) =>
    d?.status === 'rejected'
      ? `Saque rejeitado — ${d?.amount ?? ''}`
      : `Saque pago — ${d?.amount ?? ''}`,
  displayName: 'Estado do saque',
  previewData: { userName: 'Miguel', amount: '5.000 MZN', status: 'paid', date: '07/11/2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', color: '#111111', margin: '16px 0 8px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '22px' }
const card = {
  backgroundColor: '#f6f8fa',
  borderRadius: '10px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}
const amountStyle = { fontSize: '28px', fontWeight: 'bold', color: '#0a7d4f', margin: '0' }
const netLabel = { fontSize: '13px', color: '#555555', margin: '6px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const row = { fontSize: '13px', color: '#333333', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#999999', marginTop: '24px', textAlign: 'center' as const }
