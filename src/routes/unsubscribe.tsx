import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({ meta: [
    { title: 'Link de e-mail antigo — Redox Pay' },
    { name: 'description', content: 'Estado dos links antigos de e-mail da Redox Pay.' },
    { property: 'og:title', content: 'Link de e-mail antigo — Redox Pay' },
    { property: 'og:description', content: 'Estado dos links antigos de e-mail da Redox Pay.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
})

function UnsubscribePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">RedoxPay</h1>
        <p className="text-muted-foreground">Este link antigo já não está disponível. Utilize o link no rodapé de um e-mail recente da RedoxPay.</p>
      </div>
    </div>
  )
}
