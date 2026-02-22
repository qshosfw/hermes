import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMdxMermaid } from 'fumadocs-mermaid';

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
    remarkPlugins: (v) => [remarkMath, remarkMdxMermaid, ...v],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  }
});
