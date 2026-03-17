import { useParams } from '@tanstack/react-router'

export function TemplateEditorPage(): React.JSX.Element {
  const { templateId } = useParams({ from: '/settings/templates/$templateId' })

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        テンプレート編集: #{templateId}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)]">
        テンプレートの内容を編集します。
      </p>
    </div>
  )
}
