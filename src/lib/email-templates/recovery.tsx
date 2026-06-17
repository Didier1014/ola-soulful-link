import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Redefinir a sua palavra-passe — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Redefinir a sua palavra-passe</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a sua palavra-passe no {siteName}.
          Clique no botão abaixo para escolher uma nova palavra-passe.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir palavra-passe
        </Button>
        <Text style={footer}>
          Se não solicitou esta alteração, pode ignorar este email com
          segurança. A sua palavra-passe não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
