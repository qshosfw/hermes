import type { Route } from './+types/docs';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { source } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { baseOptions, gitConfig } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions';

export async function loader({ params }: Route.LoaderArgs) {
  console.log('Docs Loader Params:', params);
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  console.log('Docs Loader Slugs:', slugs);
  const page = source.getPage(slugs);
  if (!page) {
    console.error('Page not found for slugs:', slugs);
    throw new Response('Not found', { status: 404 });
  }

  return {
    slugs: page.slugs,
    path: page.path,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

import React from 'react';
import { Mermaid } from 'fumadocs-mermaid/ui';

class MermaidErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.warn("Mermaid diagram rendering failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 font-mono text-xs overflow-auto my-4">
          <p className="font-bold mb-2">Failed to render Mermaid diagram:</p>
          <pre className="whitespace-pre-wrap">{this.state.error?.message || "Unknown error"}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const SafeMermaid = (props: any) => (
  <MermaidErrorBoundary>
    <Mermaid {...props} />
  </MermaidErrorBoundary>
);

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    // you can define props for the component
    {
      slugs,
      path,
    }: {
      slugs: string[];
      path: string;
    },
  ) {
    const markdownUrl = `/llms.mdx/docs/${[...slugs, 'index.mdx'].join('/')}`;
    return (
      <DocsPage toc={toc}>
        <title>{frontmatter.title}</title>
        <meta name="description" content={frontmatter.description} />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <LLMCopyButton markdownUrl={markdownUrl} />
          <ViewOptions
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents, Mermaid: SafeMermaid }} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export default function Page({ loaderData }: Route.ComponentProps) {
  const { pageTree, ...rest } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      {clientLoader.useContent(loaderData.path, {
        ...rest,
      })}
    </DocsLayout>
  );
}
