import { useLayoutEffect, useRef, useState } from 'react';

// Text clamped to `lines`; "Read more" shows only when the text actually overflows
const ExpandableText = ({ children, lines = 2, className = '' }) => {
    const ref = useRef(null);
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || expanded) return;
        const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [children, expanded]);

    return (
        <div className={className}>
            <p
                ref={ref}
                className="whitespace-pre-line break-words"
                style={expanded ? undefined : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' }}
            >
                {children}
            </p>
            {(overflows || expanded) && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                    className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                    {expanded ? 'Read less' : 'Read more'}
                </button>
            )}
        </div>
    );
};

export default ExpandableText;
