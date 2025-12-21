from playwright.sync_api import sync_playwright, expect
import re

def verify_diagram(page):
    print("Navigating to Data Arch Diagram page...")
    page.goto("http://localhost:5173/projects/data-arch-diagram")

    # Wait for the page to load
    expect(page.get_by_text("Gemini 3: From Photo to Interactive Diagram")).to_be_visible()

    # 1. Verify "Typical Flow" Diagram (Text -> Gemini -> Code)
    # We look for the "Text Prompt" text in the first diagram area
    # Since there are multiple "Text Prompt" texts, we need to be careful.
    # The first one should be followed by Gemini, then Code.

    print("Verifying Typical Flow Diagram...")
    # This locator targets the container with "my-6" which we added for the first diagram
    typical_flow = page.locator('.my-6')
    expect(typical_flow).to_be_visible()
    expect(typical_flow).to_contain_text("Text Prompt")
    expect(typical_flow).to_contain_text("Gemini 3")
    expect(typical_flow).to_contain_text("Code")

    # 2. Verify "Multi-modal Flow" Diagram (Text + Image -> Gemini -> Code)
    # This locator targets the container with "my-10" which is the second diagram
    print("Verifying Multi-modal Flow Diagram...")
    multi_modal_flow = page.locator('.my-10')
    expect(multi_modal_flow).to_be_visible()
    expect(multi_modal_flow).to_contain_text("Text Prompt")
    expect(multi_modal_flow).to_contain_text("Image")
    expect(multi_modal_flow).to_contain_text("Gemini 3")
    expect(multi_modal_flow).to_contain_text("Code")

    # Check for the + sign
    expect(multi_modal_flow).to_contain_text("+")

    print("Taking screenshot...")
    page.screenshot(path=".jules/verification/diagram_verification.png", full_page=True)
    print("Verification complete!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_diagram(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path=".jules/verification/error.png")
            raise
        finally:
            browser.close()
