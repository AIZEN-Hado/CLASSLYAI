// Tab label: always shown on sm+, on mobile only for the active tab (animates open/closed)
const TabLabel = ({ active, children }) => (
    <span
        className={`grid transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${active ? 'grid-cols-[1fr]' : 'grid-cols-[0fr] sm:grid-cols-[1fr]'}`}
    >
        <span className="overflow-hidden">
            <span className="flex items-center gap-2 pl-2 whitespace-nowrap">{children}</span>
        </span>
    </span>
);

export default TabLabel;
