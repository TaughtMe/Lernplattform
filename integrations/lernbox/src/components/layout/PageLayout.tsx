import React, { type ReactNode } from 'react';

interface PageLayoutProps {
    header: ReactNode;
    content: ReactNode;
    footer?: ReactNode;
    className?: string;
    contentClassName?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
    header,
    content,
    footer,
    className = "",
    contentClassName = ""
}) => {
    return (
        <div className={`min-h-screen flex flex-col ${className}`}>
            {/* Header Slot */}
            <div className="sticky top-16 z-40">
                {header}
            </div>

            {/* Main Content Slot */}
            <main className={`flex-1 ${contentClassName}`}>
                {content}
            </main>

            {/* Footer Slot (Optional) */}
            {footer && (
                <div className="mt-auto">
                    {footer}
                </div>
            )}
        </div>
    );
};
