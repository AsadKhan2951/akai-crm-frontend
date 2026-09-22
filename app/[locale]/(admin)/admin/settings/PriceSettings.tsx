"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PriceSettings({ initialRequired }: Readonly<{ initialRequired: boolean }>) {
  const [required, setRequired] = useState(initialRequired);
  return <Card><CardHeader><CardTitle>Price list approval</CardTitle></CardHeader><CardContent className="space-y-3"><label className="flex items-center gap-3"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> <span>Require approval before activating a price list</span></label><Button type="button" variant="outline" disabled>Save price-list setting</Button></CardContent></Card>;
}
