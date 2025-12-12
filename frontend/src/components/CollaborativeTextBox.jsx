import React, { useRef, useEffect, useState, useCallback } from 'react';
import throttle from 'lodash/throttle';
import { useStore } from '../state/useStore';
import clsx from 'clsx';

// Simple Diff Implementation to find changes between two strings
// Returns { start, end, insert, remove }
const getDiff = (oldText, newText) => {
    let start = 0;
    while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
        start++;
    }

    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }

    return {
        start,
        remove: oldText.slice(start, oldEnd),
        insert: newText.slice(start, newEnd)
    };
};

// Caret Management Helpers
const getCaretIndex = (element) => {
    let position = 0;
    const isSupported = typeof window.getSelection !== "undefined";
    if (isSupported) {
        const selection = window.getSelection();
        if (selection.rangeCount !== 0) {
            const range = window.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            position = preCaretRange.toString().length;
        }
    }
    return position;
};

const setCaretIndex = (element, index) => {
    if (!element) return;
    const selection = window.getSelection();
    const range = document.createRange();

    // Recursive function to find text node and offset
    let charIndex = 0;
    let found = false;

    const traverse = (node) => {
        if (found) return;
        if (node.nodeType === 3) { // Text Node
            const nextIndex = charIndex + node.length;
            if (index >= charIndex && index <= nextIndex) {
                range.setStart(node, index - charIndex);
                range.collapse(true);
                found = true;
                return;
            }
            charIndex = nextIndex;
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    };

    traverse(element);

    if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

export const CollaborativeTextBox = ({ id, initialContent = '', className, onBlur }) => {
    const { updateNode, activeBoardId } = useStore();
    const [content, setContent] = useState(initialContent);
    const contentRef = useRef(initialContent);
    const editorRef = useRef(null);
    const isLocalUpdate = useRef(false);

    // Socket Listener for updates
    useEffect(() => {
        // We need to listen to generic node updates for this ID
        // Assuming parent passes logic or we hook into store's nodes?
        // useStore manages 'nodes', we can subscribe to changes.

        const unsubscribe = useStore.subscribe((state) => {
            const node = state.nodes.find(n => n.id === id);
            if (node && node.data?.label !== undefined) {
                // Check if content changed remotely
                if (node.data.label !== contentRef.current) {
                    handleRemoteUpdate(node.data.label);
                }
            }
        });
        return () => unsubscribe();
    }, [id]);

    const handleRemoteUpdate = (newText) => {
        if (isLocalUpdate.current) return; // Ignore if we just caused it (though store updates are async)

        const editor = editorRef.current;
        if (!editor) return;

        // Calculate Caret Adjustments
        const currentText = contentRef.current; // Last known validated state
        const caretPos = getCaretIndex(editor);

        // Compute diff between current local (potentially dirty?) and new remote
        // But wait, if we are typing, editor.innerText might differ from contentRef.current
        // We should compare against editor.innerText to preserve user's unsubmitted typing?
        // "Avoid overwriting user's current typing"
        // Strategy: Apply Diff to current value, adjust cursor.
        const diff = getDiff(currentText, newText);

        // If change happened BEFORE cursor, shift cursor
        let newCaretPos = caretPos;
        if (diff.start < caretPos) {
            const addedLen = diff.insert.length;
            const removedLen = diff.remove.length;
            newCaretPos += (addedLen - removedLen);
        }

        // Apply visual update
        contentRef.current = newText;
        editor.innerText = newText; // Using innerText (PlainText mode for stability)
        // If we want HTML, we accept HTML strings and use innerHTML

        setCaretIndex(editor, newCaretPos);
    };

    const emitUpdate = useCallback(throttle((newText) => {
        isLocalUpdate.current = true;
        // In this architecture, we update the STORE (Node data), which emits via socket
        updateNode(id, { data: { label: newText } });

        // Reset flag after delay to allow round-trip
        setTimeout(() => isLocalUpdate.current = false, 100);
    }, 200), [id, updateNode]);

    const onInput = (e) => {
        const newText = e.target.innerText;
        contentRef.current = newText;
        // Do not update state constantly to avoid re-renders of this component
        // setContent(newText); 

        emitUpdate(newText);
    };

    return (
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={clsx("outline-none p-2 min-w-[50px] min-h-[20px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400", className)}
            onInput={onInput}
            onBlur={onBlur}
            data-placeholder="Type here..."
            // Initialize content once
            dangerouslySetInnerHTML={{ __html: initialContent }}
            style={{ whiteSpace: 'pre-wrap' }}
        />
    );
};
