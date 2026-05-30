"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

export function ThemeToggle() {
    const [theme, setTheme] = React.useState<"light" | "dark">("light")

    React.useEffect(() => {
        // Check for saved preference or system preference
        const isDark = document.documentElement.classList.contains("dark") ||
            (localStorage.getItem("theme") === "dark")

        if (isDark) {
            document.documentElement.classList.add("dark")
            setTheme("dark")
        }
    }, [])

    const toggleTheme = () => {
        const isDark = theme === "dark"
        if (isDark) {
            document.documentElement.classList.remove("dark")
            localStorage.setItem("theme", "light")
            setTheme("light")
        } else {
            document.documentElement.classList.add("dark")
            localStorage.setItem("theme", "dark")
            setTheme("dark")
        }
    }

    return (
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
