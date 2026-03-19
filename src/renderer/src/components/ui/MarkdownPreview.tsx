import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps): React.JSX.Element {
  if (!content) {
    return (
      <p className={`text-sm text-[var(--muted-foreground)] italic ${className}`}>
        プレビューがここに表示されます
      </p>
    )
  }

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 border-b border-[var(--border)] pb-2 text-xl font-bold text-[var(--foreground)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 border-b border-[var(--border)] pb-1 text-lg font-semibold text-[var(--foreground)]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-3 text-base font-semibold text-[var(--foreground)]">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed text-[var(--foreground)]">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-[var(--foreground)]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-[var(--foreground)]">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm text-[var(--foreground)]">{children}</li>,
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName
            if (isInline) {
              return (
                <code
                  className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--foreground)]"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code
                className={`block overflow-x-auto rounded-md bg-[var(--muted)] p-3 text-xs font-mono text-[var(--foreground)] ${codeClassName ?? ''}`}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] underline hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-4 border-[var(--border)] pl-4 italic text-[var(--muted-foreground)]">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground)]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-[var(--border)]" />,
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1.5 rounded border-[var(--border)]"
                  {...props}
                />
              )
            }
            return <input type={type} {...props} />
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
