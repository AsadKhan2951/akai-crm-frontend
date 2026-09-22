import type { PermissionKey } from "@/lib/auth/permissions";

export function expandPermissionDependencies(permissionKeys: PermissionKey[], dependencies: Map<PermissionKey, PermissionKey[]>) {
  const output = new Set<PermissionKey>(permissionKeys);
  const pending = [...permissionKeys];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const dependency of dependencies.get(current) ?? []) {
      if (!output.has(dependency)) {
        output.add(dependency);
        pending.push(dependency);
      }
    }
  }
  return output;
}

export function assertCanGrantPermissions(held: ReadonlySet<string>, requested: PermissionKey[]) {
  const denied = requested.filter((permission) => !held.has(permission));
  if (denied.length > 0) throw new Error(`You may only grant permissions you hold yourself: ${denied.join(", ")}`);
}
