'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { Components } from 'react-markdown';
import { useConversationStore } from '@/lib/store/conversation-store';

// Dark forest theme matching --code-bg / --code-text
const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#E8E0D4',
    background: '#2C3830',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '0.875rem',
  },
  'pre[class*="language-"]': {
    color: '#E8E0D4',
    background: '#2C3830',
    padding: '1rem',
    borderRadius: '0.75rem',
    overflow: 'auto',
  },
  comment: { color: '#7DAF85', fontStyle: 'italic' },
  keyword: { color: '#C4956A' },
  string: { color: '#8FC490' },
  number: { color: '#C4956A' },
  function: { color: '#A8C4B8' },
  operator: { color: '#D4C5A9' },
  punctuation: { color: '#D4C5A9' },
  'class-name': { color: '#D4A97A' },
  builtin: { color: '#7DAF85' },
  boolean: { color: '#C4956A' },
  constant: { color: '#C4956A' },
  property: { color: '#A8C4B8' },
  tag: { color: '#C4956A' },
  'attr-name': { color: '#D4A97A' },
  'attr-value': { color: '#8FC490' },
};

/** Convert [[Name|treeId:threadId]] to a markdown link with custom scheme */
function processReferences(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    (_, name: string, key: string) => `[↗ ${name}](mw-ref://${key})`
  );
}

interface MarkdownRendererProps {
  content: string;
}

// Components factory — produces the components object with navigation access
function makeComponents(): Components {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!match) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <SyntaxHighlighter
          style={codeTheme}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: '0.75rem' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },

    a({ href, children }) {
      if (href?.startsWith('mw-ref://')) {
        const key = href.slice('mw-ref://'.length);
        const colonIdx = key.indexOf(':');
        const treeId = colonIdx >= 0 ? key.slice(0, colonIdx) : key;
        const threadId = colonIdx >= 0 ? key.slice(colonIdx + 1) : null;

        return (
          <button
            onClick={() => {
              const s = useConversationStore.getState();
              s.switchTree(treeId);
              if (threadId) s.switchThread(threadId);
            }}
            className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2 transition-colors"
            style={{ color: 'var(--accent-secondary)' }}
            title={`Navigate to ${key}`}
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };
}

const components = makeComponents();

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const processed = processReferences(content);
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
});
