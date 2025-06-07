# Article Plan: Modern Data Transformation without a Data Warehouse using dbt and DuckDB

**Link to code:** [https://github.com/nickbrett1/dbt-duckdb](https://github.com/nickbrett1/dbt-duckdb)

## 1. Introduction (Summary)

- **What the article is about:** This article demonstrates how to build a robust, maintainable, and evolvable data transformation pipeline without relying on a traditional cloud data warehouse.
- **Core problem solved:** Managing a set of data transformations in a structured way, locally or with minimal cloud infrastructure.
- **Key technologies used:** dbt-core and DuckDB.
- **Benefits highlighted:**
  - Reduced/eliminated cloud dependencies for the core transformation engine.
  - Lowered costs.
  - Simplified setup and management.
- **Teaser:** We'll show how to process World Development Indicator data, showcasing code snippets and embedding results directly from our local data stack.

## 2. The Situation (S)

- **The Goal:** A common need is to ingest data from various sources, transform it, and prepare it for analysis or other applications.
- **Specific Scenario:**
  - Desire to perform data transformations on World Development Indicator (WDI) data from the World Bank.
  - Needed a solution that was easy to maintain and evolve over time.
  - Crucial constraint: Avoid the complexity and cost of setting up and managing a cloud data warehouse for this scale of task.
- **Illustrative Example (from the repository):**
  - Ingesting WDI data from a CSV download: `https://databank.worldbank.org/data/download/WDI_CSV.zip`
  - Retrieving supplementary population data via an API: `http://api.worldbank.org` (e.g., for specific indicators or countries).
  - The data, even in this simple example, requires:
    - Joining across these two distinct datasets.
    - Performing transformations (e.g., cleaning, calculations, reshaping).
    - Aggregations to derive insights.

## 3. The Complication (C)

- **Challenge 1: Infrastructure Overhead:**
  - Running your own full-fledged database server (like Postgres, MySQL) locally or on a simple VM can be complex to set up, manage, back up, and scale, especially compared to managed cloud data warehouse services.
- **Challenge 2: Maintainability of Transformation Logic:**
  - Using standalone scripts (e.g., Python, Shell) for transformations, perhaps triggered by CI/CD (like GitHub Actions), is initially easy to set up.
  - However, this approach quickly becomes difficult to maintain and evolve, especially as the number of transformations and data sources grows.
  - **Specific pain points with script-based approaches:**
    - Lack of a clear structure for defining dependencies between transformation steps.
    - Difficulty in testing individual transformations.
    - Poor data lineage (understanding how data is transformed from source to end-product).
    - Documentation often becomes an afterthought and hard to keep in sync.
    - Refactoring or adding new transformations can be error-prone.

## 4. The Question (Q)

- How can we implement a data transformation workflow that is:
  - **Well-structured and easy to evolve?** (Addresses the maintainability of transformation logic)
  - **Low-cost and simple to deploy/manage?** (Addresses infrastructure overhead and avoids cloud DW lock-in for the core engine)
  - **Capable of handling typical analytical transformations** (joins, aggregations, cleaning) efficiently?

## 5. The Answer (A)

- **The Solution: Combining dbt-core with DuckDB.**
- **Part 1: Introduce dbt (Data Build Tool)**
  - **What it is:** An open-source command-line tool that enables data analysts and engineers to transform data in their warehouse more effectively.
  - **Core capabilities:**
    - Define transformations using SQL (or Python in newer versions).
    - Manage dependencies between models (transformation steps).
    - Automate testing of data quality.
    - Generate documentation and a lineage graph.
    - Version control for your transformation logic.
  - **Versions:**
    - `dbt-core`: The open-source Python package, which we'll focus on.
    - `dbt Cloud`: A managed cloud-based solution offering additional features (scheduler, UI, etc.).
- **Part 2: Introduce DuckDB**
  - **What it is:** An in-process analytical data management system (OLAP RDBMS).
  - **Key advantages for this use case:**
    - **Simplicity:** Can be installed as a Python package (`pip install duckdb`). No separate server to manage.
    - **Speed:** Optimized for analytical queries and transformations (columnar storage, vectorized execution).
    - **SQL-centric:** Integrates seamlessly with dbt's SQL-first approach.
    - **Reads multiple formats:** Can directly query Parquet, CSV, JSON files.
- **Part 3: The Combined Architecture**
  - **Conceptual Flow (Placeholder for a diagram):**
    ```
    [Source Data (WDI CSV, API)] --> [Ingestion Scripts (Python)] --(writes to)--> [Cloudflare R2 (Raw Data Buckets - Parquet/CSV)]
                                                                                            |
                                                                                            V
                                                                [DuckDB (reads from R2, acts as dbt's warehouse)]
                                                                                            | (dbt-core runs transformations)
                                                                                            V
                                                                [DuckDB (stores transformed data)]
                                                                                            |
                                                                                            V
                                                                [Cloudflare R2 (Processed Data Buckets - Parquet)] --> [Analysis / Visualization / Applications]
    ```
  - **Explanation of the diagram:**
    - Data is ingested and landed in a staging area (e.g., Cloudflare R2).
    - DuckDB reads this raw data.
    - `dbt-core` orchestrates SQL transformations within DuckDB.
    - The transformed data can be queried directly from DuckDB or materialized back to R2 (or another destination).
- **Part 4: Showcasing the Results (from the `dbt-duckdb` project)**
  - **Code Snippets:**
    - Example dbt model (SQL).
    - Python script for data ingestion.
  - **Embedded Visualizations/Data:**
    - (Placeholder for a graph showing WDI data trends over time, generated from the DuckDB instance).
    - (Placeholder for key summary statistics, e.g., number of countries, indicators processed).

## 6. Appendix: Additional Considerations & Learnings

- **A1: Development Environment - DuckDB vs. Postgres**
  - **Challenge:** DuckDB, in its default file-based mode, typically allows only one process to write to a database file at a time.
  - **Development Scenario:** Multiple tools might need concurrent access (dbt, VS Code SQL plugins, database clients like Beekeeper Studio, DuckDB CLI).
  - **Solution Used:** Configured a local Postgres database for development. dbt's profiles (`profiles.yml`) make it easy to switch target databases (DuckDB for "prod" runs, Postgres for "dev").
- **A2: Ensuring Idempotency and Change Detection for Output Data**
  - **Goal:** Ability to rerun transformations and efficiently identify which output tables/files have actually changed.
  - **Method:**
    - Developed `sync_remote_parquet.py` script (or similar logic).
    - Crucial: Export data from DuckDB to Parquet in a **canonical format** (e.g., columns sorted alphabetically, rows sorted by a consistent key) to ensure that byte-for-byte comparison reflects logical changes.
  - **Sync Logic (Example):** The initial implementation might simply overwrite the target file in R2 if the newly generated Parquet file differs from the existing one (based on a hash or content comparison). More sophisticated strategies could be versioning.
- **A3: Leveraging `rclone` for Cloud Storage Agnosticity**
  - **Tool Used:** `rclone` ("rsync for cloud storage").
  - **Benefits:**
    - Simplified scripting for syncing data to/from various cloud storage providers (like Cloudflare R2, AWS S3, Google Cloud Storage). Note, chase Cloudflare R2 because it was relatively cheap, but more importantly no egress feeds. So data could be pulled elsewhere for analysis.
    - Provides a degree of vendor independence, making it easier to migrate data between cloud storage services if needed.

---

_Self-reflection: This plan covers all the user's points and structures them logically within the SCQA framework. Placeholders for diagrams and code snippets are included. The appendix captures important nuances from the project._
