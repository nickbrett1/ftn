
from playwright.sync_api import Page, expect, sync_playwright
import time

def test_preview_file_count(page: Page):
    # 1. Navigate to the genproj page
    page.goto("http://localhost:5173/projects/genproj")

    # 2. Mock the preview API response
    nested_preview_data = {
        "files": [
            {
                "path": "README.md",
                "name": "README.md",
                "type": "file",
                "size": 100,
                "content": "test"
            },
            {
                "path": ".devcontainer",
                "name": ".devcontainer",
                "type": "folder",
                "children": [
                    {
                        "path": ".devcontainer/devcontainer.json",
                        "name": "devcontainer.json",
                        "type": "file",
                        "size": 200,
                        "content": "{}"
                    },
                    {
                        "path": ".devcontainer/Dockerfile",
                        "name": "Dockerfile",
                        "type": "file",
                        "size": 300,
                        "content": "FROM node"
                    }
                ]
            }
        ],
        "externalServices": [],
        "summary": {
            "projectName": "test-project",
            "totalFiles": 3
        }
    }

    # Intercept the preview API call
    page.route("**/projects/genproj/api/preview", lambda route: route.fulfill(json=nested_preview_data))

    # Mock capabilities to ensure consistent state
    capabilities_data = [
        {
            "id": "devcontainer-node",
            "name": "Node.js",
            "description": "Node.js development environment",
            "type": "devcontainer"
        }
    ]
    page.route("**/api/projects/genproj/capabilities", lambda route: route.fulfill(json=capabilities_data))

    page.reload()
    page.wait_for_selector("text=Loading capabilities...", state="hidden")

    # 3. Select the capability
    # Use data-testid if available or more specific locator
    page.click("input[type='checkbox']")

    # Wait a bit for the effect to trigger fetch (though mock is instant)
    page.wait_for_timeout(1000)

    # 4. Switch to Preview tab
    # Use force=True or just click on the button element found by data-testid
    page.click("button[data-testid='preview-tab']")

    # 5. Verify the file count
    # It should say "3 files will be created"
    # We use a more flexible text match in case of whitespace
    expect(page.locator("text=3 files will be created")).to_be_visible()

    # 6. Take a screenshot
    page.screenshot(path="/home/jules/verification/preview_file_count.png")

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
