import React, { createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";

const TabsContext = createContext();

export function Tabs({
    children,
    defaultValue,
    value,
    className,
    onValueChange,
}) {
    const [internalTab, setInternalTab] = useState(defaultValue);

    // Modo controlado si se pasa 'value', sino modo no controlado
    const isControlled = value !== undefined;
    const activeTab = isControlled ? value : internalTab;

    const handleTabChange = (newValue) => {
        if (!isControlled) {
            setInternalTab(newValue);
        }
        if (onValueChange) {
            onValueChange(newValue);
        }
    };

    return (
        <TabsContext.Provider
            value={{ activeTab, setActiveTab: handleTabChange }}
        >
            <div className={cn("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    );
}

export function TabsList({ children, className }) {
    return (
        <div
            className={cn(
                "inline-flex h-10 items-center justify-start rounded-lg bg-slate-100 p-1 text-slate-500",
                className
            )}
        >
            {children}
        </div>
    );
}

export function TabsTrigger({ children, value, className }) {
    const { activeTab, setActiveTab } = useContext(TabsContext);
    const isActive = activeTab === value;

    return (
        <button
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                className
            )}
        >
            {children}
        </button>
    );
}

export function TabsContent({ children, value, className }) {
    const { activeTab } = useContext(TabsContext);

    if (activeTab !== value) return null;

    return (
        <div
            className={cn(
                "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                className
            )}
        >
            {children}
        </div>
    );
}
