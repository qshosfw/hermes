---
description: How to add experimental packet types
---

1. Modify `types.ts` to add the new PacketType enum.
2. Add the corresponding builder function in `hermesProtocol.ts`.
3. Update the packet generator in `PacketPlaygroundMDX.tsx`.
4. Document the new enum and experimental status in `08-payload-overview.mdx`.
