from playwright.sync_api import sync_playwright

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the page
            page.goto("http://localhost:5173/projects/data-arch-diagram")

            # Wait for content to load
            page.wait_for_selector("text=Data Governance")

            # Take a screenshot
            page.screenshot(path=".jules/layout_verification.png", full_page=True)
            print("Screenshot taken: .jules/layout_verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_layout()
