import { StoreMapSetup } from './_components/store-map-setup';

/**
 * 店舗マップ設定 for the store in the address (Y-02-05). A thin server shell: the screen is
 * pointer drag, a file input and a draft, so everything below runs on the client.
 */
export default async function StoreMapSetupPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  // Keyed by store: a header store switch lands here with another id and must start a fresh draft
  return <StoreMapSetup key={id} storeId={id} />;
}
