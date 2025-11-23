
from playwright.sync_api import Page, expect, sync_playwright
import time
import re

def test_preview_file_count(page: Page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    page.goto("http://localhost:5173/projects/genproj")

    # Mock preview
    nested_preview_data = {
        "files": [
            { "path": "README.md", "name": "README.md", "type": "file", "size": 100, "content": "test" },
            { "path": "folder", "name": "folder", "type": "folder", "children": [
                { "path": "folder/file1", "name": "file1", "type": "file", "size": 100, "content": "test" },
                { "path": "folder/file2", "name": "file2", "type": "file", "size": 100, "content": "test" }
            ]}
        ],
        "externalServices": [],
        "summary": { "projectName": "test-project", "totalFiles": 3 }
    }
    page.route("**/projects/genproj/api/preview", lambda route: route.fulfill(json=nested_preview_data))

    # Mock capabilities
    capabilities_data = [
        { "id": "devcontainer-node", "name": "Node.js", "description": "Node.js", "type": "devcontainer" }
    ]
    page.route("**/api/projects/genproj/capabilities", lambda route: route.fulfill(json=capabilities_data))

    page.reload(wait_until="networkidle")

    # Select capability (use label)
    print("Selecting capability...")
    page.locator("label").filter(has_text="Node.js").click()

    # Wait a bit
    page.wait_for_timeout(500)

    # Click Preview tab
    print("Clicking Preview tab...")
    preview_tab = page.locator("button[data-testid='preview-tab']")
    preview_tab.click(force=True)

    # Verify tab switch
    print("Verifying tab switch...")
    # Check if the tab has the active class (text-green-400)
    try:
        expect(preview_tab).to_have_class(re.compile(r"text-green-400"))
    except AssertionError:
        print("Tab did not become active. Screenshotting...")
        page.screenshot(path="/home/jules/verification/tab_fail.png")
        raise

    # Verify file count
    print("Verifying file count...")
    expect(page.locator("text=3 files will be created")).to_be_visible()

    page.screenshot(path="/home/jules/verification/success.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_preview_file_count(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/failure.png")
            raise e
        finally:
            browser.close()
