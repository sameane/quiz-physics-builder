
import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const arabicFonts = [
  "Tajawal", "Cairo", "Amiri", "Almarai", "Aref Ruqaa", 
  "Changa", "El Messiri", "Harmattan", "IBM Plex Sans Arabic", 
  "Katibeh", "Lalezar", "Lateef", "Lemonada", "Mada", 
  "Markazi Text", "Mirza", "Noto Kufi Arabic", "Noto Naskh Arabic", 
  "Rakkas", "Reem Kufi", "Rubik", "Scheherazade New"
];

const fontSizes = [
  { label: 'صغير جداً', value: '1' },
  { label: 'صغير', value: '2' },
  { label: 'عادي', value: '3' },
  { label: 'كبير', value: '4' },
  { label: 'كبير جداً', value: '5' },
  { label: 'ضخم', value: '6' },
  { label: 'عملاق', value: '7' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className = '' 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isTyping = useRef(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync value to innerHTML
  useEffect(() => {
    if (editorRef.current && !isTyping.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isTyping.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      setTimeout(() => isTyping.current = false, 100); 
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  // Icons (SVGs)
  const Icons = {
    undo: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
    redo: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>,
    code: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    bold: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" /></svg>,
    italic: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /><path d="M19 4h-9M14 20H5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>,
    underline: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16" /></svg>,
    alignLeft: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>,
    alignCenter: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>,
    alignRight: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg>,
    listBullet: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M4 6l.01 0M4 12l.01 0M4 18l.01 0" /></svg>,
    listOrdered: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7v.01M3 12v.01M3 17v.01" /></svg>,
    palette: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  };

  return (
    <div className={`border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-shadow ${className}`}>
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#f8f9fa] border-b border-gray-200 select-none text-gray-700" dir="ltr">
        
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => execCmd('undo')} className="btn-tool" title="تراجع">{Icons.undo}</button>
          <button type="button" onClick={() => execCmd('redo')} className="btn-tool" title="إعادة">{Icons.redo}</button>
        </div>
        <div className="divider"></div>

        {/* Font Family */}
        <select 
          onChange={(e) => execCmd('fontName', e.target.value)} 
          className="h-7 border border-gray-200 rounded text-xs px-1 bg-white hover:bg-gray-50 outline-none w-24"
          defaultValue=""
          title="نوع الخط"
        >
          <option value="" disabled>الخط</option>
          {arabicFonts.map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
          ))}
        </select>

        {/* Font Size */}
        <select 
          onChange={(e) => execCmd('fontSize', e.target.value)} 
          className="h-7 border border-gray-200 rounded text-xs px-1 bg-white hover:bg-gray-50 outline-none w-20"
          defaultValue="3"
          title="حجم الخط"
        >
          {fontSizes.map(size => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>
        
        <div className="divider"></div>

        {/* Formatting */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => execCmd('bold')} className="btn-tool" title="عريض">{Icons.bold}</button>
          <button type="button" onClick={() => execCmd('italic')} className="btn-tool" title="مائل">{Icons.italic}</button>
          <button type="button" onClick={() => execCmd('underline')} className="btn-tool" title="تسطير">{Icons.underline}</button>
          
          {/* Color Picker */}
          <div className="relative flex items-center">
            <button 
              type="button" 
              onClick={() => colorInputRef.current?.click()} 
              className="btn-tool relative" 
              title="لون النص"
            >
              {Icons.palette}
            </button>
            <input 
              ref={colorInputRef}
              type="color" 
              onChange={(e) => execCmd('foreColor', e.target.value)}
              className="absolute opacity-0 w-0 h-0"
            />
          </div>
          
          <button 
            type="button" 
            onClick={() => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) {
                    const text = selection.toString();
                    execCmd('insertHTML', `<code class="bg-gray-100 px-1 rounded font-mono text-red-600 border border-gray-200">${text}</code>`);
                }
            }} 
            className="btn-tool" 
            title="كود / تمييز"
          >
            {Icons.code}
          </button>
        </div>

        <div className="divider"></div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => execCmd('justifyRight')} className="btn-tool" title="محاذاة يمين">{Icons.alignRight}</button>
          <button type="button" onClick={() => execCmd('justifyCenter')} className="btn-tool" title="توسيط">{Icons.alignCenter}</button>
          <button type="button" onClick={() => execCmd('justifyLeft')} className="btn-tool" title="محاذاة يسار">{Icons.alignLeft}</button>
        </div>

        <div className="divider"></div>

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => execCmd('insertUnorderedList')} className="btn-tool" title="قائمة نقطية">{Icons.listBullet}</button>
          <button type="button" onClick={() => execCmd('insertOrderedList')} className="btn-tool" title="قائمة رقمية">{Icons.listOrdered}</button>
        </div>

      </div>
      
      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="
          w-full p-3 outline-none font-sans text-sm min-h-[100px] bg-white text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap
          [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:my-2 
          [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:my-2
        "
        dir="auto"
        role="textbox"
        aria-multiline="true"
        style={{ direction: 'rtl', textAlign: 'right' }} 
      />
      
      {/* Placeholder Simulation */}
      {!value && (
         <div className="absolute top-[50px] right-3 text-gray-400 pointer-events-none text-sm">
           {placeholder}
         </div>
      )}

      <style>{`
        .btn-tool {
          min-width: 28px;
          height: 28px;
          padding: 0 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .btn-tool:hover {
          background-color: #e5e7eb;
          color: #1e3a8a;
        }
        .divider {
          width: 1px;
          height: 20px;
          background-color: #d1d5db;
          margin: 0 6px;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
