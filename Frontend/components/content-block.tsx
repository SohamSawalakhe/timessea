import { useRef, useEffect } from "react";

export const ContentBlock = ({
  html,
  onChange,
  onFocus,
  disabled = false,
  className,
}: {
  html: string;
  onChange: (html: string) => void;
  onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  className?: string;
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      contentEditableRef.current &&
      contentEditableRef.current.innerHTML !== html
    ) {
      contentEditableRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={contentEditableRef}
      className={className}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={(e) => {
        onChange(e.currentTarget.innerHTML);
      }}
      onFocus={onFocus}
      onBlur={(e) => {
        if (e.currentTarget.innerHTML !== html) {
          onChange(e.currentTarget.innerHTML);
        }
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text/plain");
        // Regex to check if the pasted text is a URL
        const urlRegex =
          /^(http(s)?:\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g;
        if (urlRegex.test(text)) {
          e.preventDefault();
          document.execCommand(
            "insertHTML",
            false,
            `<a href="${text}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${text}</a>`,
          );
        }
      }}
    />
  );
};
