import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostForm } from "../post-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}));

// Mock toast hook
vi.mock("@/shared/components/ui/toast", () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

// Mock actions
vi.mock("@/features/blog", () => ({
    createPost: vi.fn(),
    updatePost: vi.fn(),
    upsertTranslation: vi.fn(),
    translateContentAction: vi.fn(),
}));

describe("PostForm Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders in creation mode correctly", () => {
        render(<PostForm />);
        expect(screen.getByText("New Post")).toBeDefined();
        expect(screen.getByLabelText(/Title/i)).toBeDefined();
        expect(screen.getByLabelText(/Slug/i)).toBeDefined();
    });

    it("auto-generates slug from title in new mode", () => {
        render(<PostForm />);
        const titleInput = screen.getByLabelText(/Title/i);
        const slugInput = screen.getByLabelText(/Slug/i) as HTMLInputElement;

        fireEvent.change(titleInput, { target: { value: "Hello World" } });
        expect(slugInput.value).toBe("hello-world");
    });

    it("loads existing post data in edit mode", () => {
        const mockPost = {
            id: "1",
            title: "Existing Post",
            slug: "existing-post",
            content: "Some content",
            published: true
        };
        render(<PostForm post={mockPost} />);
        
        expect(screen.getByText("Edit Post")).toBeDefined();
        expect((screen.getByLabelText(/Title/i) as HTMLInputElement).value).toBe("Existing Post");
    });

    it("shows tabs for all active locales", () => {
        render(<PostForm />);
        // Assuming locales like en, tr, etc. are active
        expect(screen.getByRole("tab", { name: /EN/i })).toBeDefined();
        expect(screen.getByRole("tab", { name: /TR/i })).toBeDefined();
    });

    it("triggers save action on submit", async () => {
        const { createPost } = await import("@/features/blog");
        render(<PostForm />);
        
        fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "New Post" } });
        fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Post content" } });
        
        const submitBtn = screen.getByRole("button", { name: /Save All Changes/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
                title: "New Post",
                content: "Post content"
            }));
        });
    });
});
