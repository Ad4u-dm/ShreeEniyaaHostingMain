import InvoicePrintClient from './InvoicePrintClient';

// For static export: provide at least one placeholder
// Actual IDs will be handled client-side
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <InvoicePrintClient />;
}
