import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Printer } from 'lucide-react';

export const gitConfig = {
  user: 'x1up',
  repo: 'hermes',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Hermes Link',
      url: '/',
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs/rfc/01-introduction',
        active: 'nested-url',
      },
      {
        text: 'Mesh Simulator',
        url: '/simulator',
        active: 'nested-url',
      },
      {
        text: 'PDF Specification',
        url: '/hermes-protocol-spec.pdf',
        icon: <Printer />,
        type: 'icon',
        external: true,
      }
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
