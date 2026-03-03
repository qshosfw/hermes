import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import MeshVisualizer from '@/components/visualizer/MeshVisualizer';

export default function SimulatorPage() {
    return (
        <HomeLayout {...baseOptions()}>
            <div className="container mx-auto py-12 px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-black tracking-tight mb-2">Protocol Simulator</h1>
                    <p className="text-muted-foreground">Interactively simulate Hermes Link mesh routing and interference patterns.</p>
                </div>
                <div className="max-w-6xl mx-auto border rounded-xl overflow-hidden bg-background shadow-2xl">
                    <MeshVisualizer />
                </div>
            </div>
        </HomeLayout>
    );
}
