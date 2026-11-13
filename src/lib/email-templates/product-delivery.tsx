import * as React from 'react';
import { Html, Head, Body, Container, Preview, Heading, Text, Button } from '@react-email/components';
import type { TemplateEntry } from './registry';
import { EmailLogo } from './_logo';
import { checkoutCopy, type CheckoutLanguage } from '../checkout-language';

const copy = {
  pt: { title: 'Pagamento confirmado', receipt: 'Compra', reference: 'Referência', expiry: 'O link de download é válido por 7 dias.', missing: 'O vendedor irá fornecer os detalhes da entrega.', support: 'Suporte do vendedor' },
  en: { title: 'Payment confirmed', receipt: 'Purchase', reference: 'Reference', expiry: 'The download link is valid for 7 days.', missing: 'The seller will provide delivery details.', support: 'Seller support' },
  es: { title: 'Pago confirmado', receipt: 'Compra', reference: 'Referencia', expiry: 'El enlace de descarga es válido por 7 días.', missing: 'El vendedor proporcionará los detalles de entrega.', support: 'Soporte del vendedor' },
  fr: { title: 'Paiement confirmé', receipt: 'Achat', reference: 'Référence', expiry: 'Le lien de téléchargement est valable 7 jours.', missing: 'Le vendeur fournira les détails de livraison.', support: 'Assistance du vendeur' },
};
function ProductDelivery({ customerName = 'Cliente', productName = 'Produto', amount = '', reference = '', deliveryUrl = null, digital = false, support = '', language = 'pt' }: { customerName?: string; productName?: string; amount?: string; reference?: string; deliveryUrl?: string | null; digital?: boolean; support?: string; language?: CheckoutLanguage }) {
  const t = copy[language] ?? copy.pt;
  const checkout = checkoutCopy[language] ?? checkoutCopy.pt;
  return <Html lang={language}><Head /><Preview>{t.title} — {productName}</Preview><Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}><Container style={{ maxWidth: '560px', padding: '28px' }}><EmailLogo /><Heading>{t.title}</Heading><Text>{customerName}, {checkout.thanks}</Text><Text><strong>{t.receipt}:</strong> {productName} — {amount}</Text><Text>{t.reference}: {reference}</Text>{deliveryUrl ? <><Button href={deliveryUrl} style={{ backgroundColor: '#e32837', color: '#ffffff', padding: '12px 20px', borderRadius: '6px' }}>{checkout.access}</Button>{digital && <Text>{t.expiry}</Text>}</> : <Text>{t.missing}</Text>}{support && <Text>{t.support}: {support}</Text>}</Container></Body></Html>;
}
export const template = { component: ProductDelivery, subject: (data: Record<string, unknown>) => `${copy[(data.language as CheckoutLanguage) ?? 'pt']?.title ?? copy.pt.title} — ${data.productName ?? 'Redox Pay'}`, displayName: 'Recibo e entregável do comprador', previewData: { customerName: 'Maria', productName: 'Curso digital', amount: '300 MT', reference: 'exemplo', deliveryUrl: 'https://www.redoxpay.site', digital: true } } satisfies TemplateEntry;