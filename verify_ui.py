from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # Launch browser (headless by default)
        browser = p.chromium.launch()
        page = browser.new_page()

        # Navigate to the page
        print("Navigating to genproj...")
        page.goto("http://localhost:4173/projects/genproj")

        # Wait for content to load
        page.wait_for_selector("text=Project Configuration")

        # Take a screenshot
        screenshot_path = "/home/jules/verification/capability_cards_filtered.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        # Check for "Requires: Docker" text
        content = page.content()
        if "Requires: Docker" in content:
            print("FAILURE: Found 'Requires: Docker' in the page content.")
            exit(1)
        else:
            print("SUCCESS: 'Requires: Docker' is correctly hidden.")

        browser.close()

if __name__ == "__main__":
    run()
