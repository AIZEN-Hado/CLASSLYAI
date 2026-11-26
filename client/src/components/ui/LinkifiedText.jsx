// Plain text with http(s)/www URLs turned into links (trailing punctuation stays text)
const URL_RE = /((?:\bhttps?:\/\/|\bwww\.)[^\s<]*[^\s<.,;:!?)\]'"])/gi;

const shortLabel = (href) => {
    try {
        const url = new URL(href);
        const parts = url.pathname.split('/').filter(Boolean);
        if (!parts.length) return url.hostname;
        const last = decodeURIComponent(parts[parts.length - 1]).slice(0, 30);
        return parts.length > 1 ? `${url.hostname}/…/${last}` : `${url.hostname}/${last}`;
    } catch {
        return href.length > 40 ? `${href.slice(0, 40)}…` : href;
    }
};

const LINK_CLASS = 'font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-600/30 hover:decoration-current break-all';

const LinkifiedText = ({ text, short = true, linkClassName = LINK_CLASS }) => {
    if (!text) return null;
    return text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return part;
        const href = /^www\./i.test(part) ? `https://${part}` : part;
        return (
            <a
                key={i}
                href={href}
                title={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={linkClassName}
            >
                {short ? shortLabel(href) : part}
            </a>
        );
    });
};

export default LinkifiedText;
