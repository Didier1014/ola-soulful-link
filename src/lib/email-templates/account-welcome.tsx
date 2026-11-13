import * as React from 'react';
import { Html, Head, Body, Container, Preview, Heading, Text, Button } from '@react-email/components';
import type { TemplateEntry } from './registry';
import { EmailLogo } from './_logo';

function AccountWelcome({ name = 'Olá', test = false }: { name?: string; test?: boolean }) {
  return <Html lang="pt"><Head /><Preview>{test ? 'Teste de envio Redox Pay' : 'A sua conta Redox Pay está pronta'}</Preview><Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}><Container style={{ maxWidth: '560px', padding: '28px' }}><EmailLogo /><Heading>{test ? 'Email de teste' : 'Bem-vindo à Redox Pay'}</Heading><Text>{name}, {test ? 'este email confirma que o envio de emails da Redox Pay está a funcionar.' : 'o seu email foi confirmado e a sua conta está pronta.'}</Text>{!test && <Button href="https://www.redoxpay.site/dashboard" style={{ backgroundColor: '#e32837', color: '#ffffff', padding: '12px 20px', borderRadius: '6px' }}>Aceder à minha conta</Button>}<Text>Se não reconhece esta conta, contacte o suporte da Redox Pay.</Text></Container></Body></Html>;
}

export const template = { component: AccountWelcome, subject: 'Bem-vindo à Redox Pay', displayName: 'Boas-vindas à conta confirmada', previewData: { name: 'João' } } satisfies TemplateEntry;
export const testTemplate = { component: AccountWelcome, subject: 'Redox Pay — teste de email', displayName: 'Teste de envio', previewData: { name: 'João', test: true } } satisfies TemplateEntry;