import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMdxMermaid } from 'fumadocs-mermaid';
import { remarkAlert } from 'remark-github-blockquote-alert';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});



export default defineConfig({
  mdxOptions: {
    remarkPlugins: (v) => [remarkMath, remarkMdxMermaid, remarkAlert, ...v],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  }
});
