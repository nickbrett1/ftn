from playwright.sync_api import sync_playwright

def verify_table():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173/projects/speckit-dev")
            # Wait for the specific section to be visible
            # Locate the heading "3. Big changes are difficult to manage"
            heading = page.get_by_role("heading", name="3. Big changes are difficult to manage")
            heading.scroll_into_view_if_needed()

            # Wait a bit for any lazy loading or rendering
            page.wait_for_timeout(1000)

            # Take a screenshot of the viewport, which should now contain the table
            page.screenshot(path=".jules/table_verification_scrolled.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_table()
