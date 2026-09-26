import { headers, cookies } from 'next/headers';
import { userAgent } from 'next/server';

/** Phones get the read-only glance. Tablets/desktops get the full console.
 *  Cookie `admin_view=desktop` forces the full console (set by the glance footer link). */
export async function isPhoneRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_view')?.value === 'desktop') return false;
  const { device } = userAgent({ headers: await headers() });
  return device.type === 'mobile';
}
