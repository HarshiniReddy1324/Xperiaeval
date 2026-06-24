import React from 'react';

export function IntegrityTextarea({
  fieldId,
  value,
  onChange,
  integrity,
  rows = 4,
  required,
  placeholder,
}) {
  const {
    onFieldFocus,
    onFieldBlur,
    onFieldKeyDown,
    onFieldBeforeInput,
    onFieldChange,
    onFieldContextMenu,
    blockClipboard,
  } = integrity;

  return (
    <textarea
      required={required}
      rows={rows}
      value={value}
      placeholder={placeholder || 'Type your answer here.'}
      onFocus={() => onFieldFocus(fieldId)}
      onBlur={() => onFieldBlur(fieldId)}
      onKeyDown={(e) => onFieldKeyDown(fieldId, e)}
      onBeforeInput={(e) => onFieldBeforeInput(fieldId, e)}
      onPaste={blockClipboard}
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onDrop={(e) => {
        e.preventDefault();
        blockClipboard(e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onFieldContextMenu();
      }}
      onChange={(e) => {
        onFieldChange(fieldId, e.target.value);
        onChange(e.target.value);
      }}
      className="integrityField"
      autoComplete="off"
      spellCheck
    />
  );
}
