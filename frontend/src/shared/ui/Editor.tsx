import { useEffect, useMemo, useRef } from "react";
import { Jodit } from "jodit";
import "jodit/es2021/jodit.min.css";
import { sanitizeRichTextHtml } from "@/shared/lib/richText";

interface EditorProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

const EMPTY_EDITOR_VALUE = "<p><br></p>";

const Editor = ({ placeholder, value, onChange }: EditorProps) => {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const instanceRef = useRef<Jodit | null>(null);
  const lastValueRef = useRef("");
  const onChangeRef = useRef(onChange);
  const sanitizedValue = useMemo(() => sanitizeRichTextHtml(value), [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const element = elementRef.current;

    if (!element || instanceRef.current) {
      return;
    }

    const instance = Jodit.make(element, {
      autofocus: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "outdent",
        "indent",
        "|",
        "brush",
        "paragraph",
        "fontsize",
        "|",
        "link",
        "table",
        "hr",
        "|",
        "undo",
        "redo",
      ],
      buttonsMD: [
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "paragraph",
        "fontsize",
        "|",
        "undo",
        "redo",
      ],
      buttonsSM: ["bold", "italic", "|", "ul", "ol", "|", "undo", "redo"],
      buttonsXS: ["bold", "italic", "ul", "ol"],
      placeholder,
      showCharsCounter: false,
      showWordsCounter: true,
      showXPathInStatusbar: false,
      statusbar: true,
      toolbarAdaptive: false,
      toolbarSticky: false,
      minHeight: 360,
      enter: "p",
      events: {
        change: () => {
          const nextValue = sanitizeRichTextHtml(instance.value);

          if (nextValue === lastValueRef.current) {
            return;
          }

          lastValueRef.current = nextValue;
          onChangeRef.current(nextValue);
        },
      },
    });

    instanceRef.current = instance;
    lastValueRef.current = sanitizedValue;
    instance.value = sanitizedValue || EMPTY_EDITOR_VALUE;

    return () => {
      instance.destruct();
      instanceRef.current = null;
    };
  }, [placeholder]);

  useEffect(() => {
    const instance = instanceRef.current;

    if (!instance) {
      return;
    }

    // Avoid pushing the same locally edited value back into Jodit,
    // which resets the caret position while the user is typing.
    if (sanitizedValue === lastValueRef.current) {
      return;
    }

    const normalizedCurrentValue = sanitizeRichTextHtml(instance.value);

    if (normalizedCurrentValue === sanitizedValue) {
      lastValueRef.current = sanitizedValue;
      return;
    }

    lastValueRef.current = sanitizedValue;
    instance.value = sanitizedValue || EMPTY_EDITOR_VALUE;
  }, [sanitizedValue]);

  return (
    <div className="rich-text-editor__frame">
      <textarea
        ref={elementRef}
        className="rich-text-editor__source"
        defaultValue={sanitizedValue}
      />
    </div>
  );
};

export default Editor;
