// Plain text with http(s)/www URLs turned into links (trailing punctuation stays text).
// The full URL is shown so copying the text gives the real link.
const URL_RE = /((?:\bhttps?:\/\/|\bwww\.)[^\s<]*[^\s<.,;:!?)\]'"])/gi;

const LINK_CLASS = 'font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-600/30 hover:decoration-current break-all';

const LinkifiedText = ({ text, linkClassName = LINK_CLASS }) => {
    if (!text) return null;
    return text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return part;
        const href = /^www\./i.test(part) ? `https://${part}` : part;
        return (
            <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={linkClassName}
            >
                {part}
            </a>
        );
    });
};

export default LinkifiedText;
