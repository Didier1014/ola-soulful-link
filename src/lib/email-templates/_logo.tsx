import * as React from 'react'
import { Img, Section } from '@react-email/components'

export const LOGO_URL =
  'https://www.redoxpay.site/__l5e/assets-v1/319f30a6-ecca-4929-b0b2-85921f5aac86/redox-logo.jpg'

export const EmailLogo = () => (
  <Section style={{ textAlign: 'center', padding: '24px 0 8px' }}>
    <Img
      src={LOGO_URL}
      alt="Redox Pay"
      width="140"
      height="auto"
      style={{ display: 'inline-block', margin: '0 auto' }}
    />
  </Section>
)
