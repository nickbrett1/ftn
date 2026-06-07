## Mermaid Diagrams

When including Mermaid diagrams in `.svx` files (processed by MDsvex):

1.  **Newlines in Labels**: You must use the HTML entity `&#10` **without a semicolon** to insert a line break within a node label. Using `\n` or `&#10;` (with a semicolon) will not render correctly.
    *   **Correct:** `Node["Line 1&#10Line 2"]`
    *   **Incorrect:** `Node["Line 1\nLine 2"]`
    *   **Incorrect:** `Node["Line 1&#10;Line 2"]`
2.  **Example Reference**: See `webapp/src/routes/projects/dbt-duckdb/dbt-duckdb.svx` for a working implementation of this technique.
