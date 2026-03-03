import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import PacketPlaygroundMDX from '@/components/visualizer/PacketPlaygroundMDX';

export default function PacketBuilderPage() {
    return (
        <HomeLayout {...baseOptions()}>
            <div className="container mx-auto py-12 px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-black tracking-tight mb-2">Packet Builder</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Construct, inspect, and export Hermes Protocol frames layer-by-layer with real-time cryptographic encoding.
                    </p>
                </div>
                <div className="max-w-7xl mx-auto">
                    <PacketPlaygroundMDX />
                </div>
            </div>
        </HomeLayout>
    );
}
