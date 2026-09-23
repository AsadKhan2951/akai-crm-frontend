import { ProfileView } from "@/components/ProfileView";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ProfileView locale={locale} showShop={true} />;
}
