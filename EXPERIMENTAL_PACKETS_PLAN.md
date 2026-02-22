# Implementation Plan: Experimental Packets & Specification Extension

## Objective
Establish a formal, documented process for introducing Experimental, Vendor-Specific, and Custom Packet Types into the Hermes Protocol architecture without disrupting the `0-31` type boundaries, ensuring smooth extensions directly inside the current UI tools and RF stack.

## Phase 1: Allocating the Type Specification Boundaries
The Hermes Header uses 5 bits (`0-31`) to classify packet payload contents.
1. **Current Allocation**: `0-5` (ACK, PING, MESSAGE, TELEMETRY, DISCOVERY, KEY_RATCHET).
2. **Planned Updates**:
   - Reserve `6-15` for Future Protocol Core Expansions.
   - Reserve `16-31` explicitly for **Vendor / Experimental / Custom** Packets.
3. This allows independent forks and corporate consumers to map bespoke high-speed RF integrations (e.g. Drone Video, Machine-to-Machine controls) utilizing the exact same underlying ChaCha20 crypto and RS128,96 link security.

## Phase 2: Updating the `08-payload-overview` Document
The core documentation will receive a permanent new section detailing **8.4 Custom & Experimental Packets**.
1. This section will declare ranges `16-31` as safe havens.
2. It will describe the architectural flow (Data Link -> Crypto Envelope -> Custom Parser).

## Phase 3: Extending the Interactive Visualizer Pipeline
To keep our development tools completely mapped to the RFC changes, we need to adjust the UI tools to inherently support `EXPERIMENTAL` type tracking:
1. **`types.ts`**:
   - Extend the `PacketType` enum with an `EXPERIMENTAL_16 = 16` flag.
2. **`hermesProtocol.ts` (Codec definitions)**:
   - Export an isolated `.buildExperimentalPayload(dataBlob)` method ensuring external devs can visually test their custom binary mappings right from the web page.
3. **`PacketPlaygroundMDX.tsx`**:
   - Add the new experimental flag dropdown to the Interactive Builder.
   - Provide a Raw Hex-Injection input allowing authors to copy-paste exact `0-54` byte structures and see the resulting physical bitstream generated accurately.

## Phase 4: Workflow Standardization
Any further additions to the specific `0-15` canonical protocols must utilize an overarching `generate` architecture. Standardize an `.agents/workflows/extend-protocol.md` script that automatically prompts users/assistants extending the spec to simultaneously inject their changes into the MDX definitions, Typescript generators, and the A4 LaTeX Print script.

## Goal Check
- [ ] Create space in the documentation mapping the integer block definitions clearly for devs seeking custom solutions.
- [ ] Deploy raw-hex injection to the tools pipeline alongside a testing type mapping `16`.
