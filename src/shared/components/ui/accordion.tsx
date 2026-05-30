"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/shared/utils"

type AccordionValue = string | string[];

type AccordionContextType = {
    expanded: AccordionValue;
    setExpanded: (value: string) => void;
    type: "single" | "multiple";
    collapsible: boolean;
}

const AccordionContext = React.createContext<AccordionContextType>({} as AccordionContextType);

const AccordionRoot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        type?: "single" | "multiple";
        collapsible?: boolean;
        defaultValue?: AccordionValue;
    }
>(({ className, type = "single", collapsible = false, defaultValue, ...props }, ref) => {
    const initialValue =
        defaultValue ?? (type === "multiple" ? [] : "");
    const [expanded, setExpandedState] = React.useState<AccordionValue>(initialValue);

    const setExpanded = (value: string) => {
        if (type === "single") {
            setExpandedState((prev) => (prev === value && collapsible ? "" : value));
            return;
        }

        setExpandedState((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            return current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value];
        });
    };

    return (
        <AccordionContext.Provider value={{ expanded, setExpanded, type, collapsible }}>
            <div ref={ref} className={cn("", className)} {...props} />
        </AccordionContext.Provider>
    )
})
AccordionRoot.displayName = "Accordion"

const AccordionItemContext = React.createContext<{ value: string }>({ value: "" });

const AccordionItemRoot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
        <div ref={ref} className={cn("border-b", className)} {...props} />
    </AccordionItemContext.Provider>
))
AccordionItemRoot.displayName = "AccordionItem"

const AccordionTriggerRoot = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { expanded, setExpanded } = React.useContext(AccordionContext);
    const { value } = React.useContext(AccordionItemContext);

    const isOpen = Array.isArray(expanded) ? expanded.includes(value) : expanded === value;

    return (
        <div className="flex">
            <button
                ref={ref}
                onClick={() => setExpanded(value)}
                className={cn(
                    "group flex flex-1 items-center justify-between py-4 text-left font-medium transition-colors",
                    className
                )}
                data-state={isOpen ? "open" : "closed"}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
        </div>
    )
})
AccordionTriggerRoot.displayName = "AccordionTrigger"

const AccordionContentRoot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { expanded } = React.useContext(AccordionContext);
    const { value } = React.useContext(AccordionItemContext);
    const isOpen = Array.isArray(expanded) ? expanded.includes(value) : expanded === value;

    return (
        <div
            className={cn(
                "grid transition-all duration-200 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
            data-state={isOpen ? "open" : "closed"}
        >
            <div className="overflow-hidden">
                <div ref={ref} className={cn("pb-4 pt-0", className)} {...props}>
                    {children}
                </div>
            </div>
        </div>
    )
})
AccordionContentRoot.displayName = "AccordionContent"

export {
    AccordionRoot as Accordion,
    AccordionItemRoot as AccordionItem,
    AccordionTriggerRoot as AccordionTrigger,
    AccordionContentRoot as AccordionContent
}
