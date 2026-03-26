import { useMemo } from "react";
import { sanitizeRichTextHtml } from "@/shared/lib/richText";
import Editor from "@/shared/ui/Editor";

interface RichTextEditorProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export const RichTextEditor = ({
  placeholder,
  value,
  onChange,
}: RichTextEditorProps) => {
  const sanitizedValue = useMemo(() => sanitizeRichTextHtml(value), [value]);

  return (
    <div className="rich-text-editor">
      <Editor
        placeholder={placeholder}
        value={sanitizedValue}
        onChange={onChange}
      />
    </div>
  );
};
