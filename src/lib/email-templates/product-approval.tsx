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

interface ProductApprovalProps {
  userName?: string
  productName?: string
  status?: 'approved' | 'rejected'
  reason?: string
}

const ProductApprovalEmail = ({
  userName = 'Utilizador',
  productName = 'Produto',
  status = 'approved',
  reason = '',
}: ProductApprovalProps) => {
  const approved = status === 'approved'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{approved ? `Produto aprovado — ${productName}` : `Produto rejeitado — ${productName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailLogo />
          <Heading style={h1}>{approved ? '🎉 Produto aprovado!' : '⚠️ Produto rejeitado'}</Heading>
          <Text style={text}>
            Olá {userName},{' '}
            {approved
              ? `o seu produto "${productName}" foi aprovado e já está disponível para venda.`
              : `o seu produto "${productName}" foi rejeitado.`}
          </Text>

          {!approved && reason ? (
            <Section style={card}>
              <Text style={row}><strong>Motivo:</strong> {reason}</Text>
            </Section>
          ) : null}

          <Hr style={hr} />

          <Text style={text}>
            {approved
              ? 'Já pode partilhar o link de pagamento com os seus clientes.'
              : 'Corrija o motivo indicado e submeta o produto novamente para revisão.'}
          </Text>

          <Text style={footer}>
            RedoxPay — Pagamentos digitais em Moçambique
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProductApprovalEmail,
  subject: (d: Record<string, any>) =>
    d?.status === 'rejected'
      ? `Produto rejeitado — ${d?.productName ?? ''}`
      : `Produto aprovado — ${d?.productName ?? ''}`,
  displayName: 'Aprovação de produto',
  previewData: { userName: 'Miguel', productName: 'Curso de Marketing', status: 'approved' },
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
}
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const row = { fontSize: '13px', color: '#333333', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#999999', marginTop: '24px', textAlign: 'center' as const }
