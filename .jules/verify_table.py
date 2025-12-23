from playwright.sync_api import sync_playwright

def verify_table():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173/projects/speckit-dev")
            # Wait for the table to appear
            page.wait_for_selector("table")
            # Take a screenshot
            page.screenshot(path=".jules/table_verification.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_table()
