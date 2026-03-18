# Product Requirements Document (PRD): Wintel

## 1. Product Overview
**Product Name:** Wintel  
**Description:** A strategic intelligence tool providing actionable insights, breaking points, and chronological timelines for utility and energy companies.  
**Vision:** To empower account executives, sales teams, and strategic planners with real-time, AI-driven intelligence on target utility companies, enabling highly personalized and timely outreach based on regulatory shifts, infrastructure projects, and financial milestones.

## 2. Target Audience
* **Enterprise Sales Representatives:** Need to understand a utility's pain points to pitch relevant solutions.
* **Strategic Account Managers:** Require deep, ongoing intelligence on specific Operating Companies (OpCos) within large utility holding companies.
* **Business Development Leads:** Need to identify key stakeholders and upcoming events to network effectively.

## 3. Core Features & Functional Requirements

### 3.1. Configuration & Filtering (Sidebar)
Users must be able to define the scope of their intelligence report before generation.
* **Company Selection:** 
  * Hierarchical selection of a parent holding company (e.g., Duke Energy, Southern Company).
  * Multi-selection of specific Operating Companies (OpCos) under the parent company.
* **Functional Areas:**
  * Multi-select tags to focus the AI's analysis.
  * Options: *Technology, Regulatory, Customer, Financials, Infrastructure*.
* **Analysis Modes (Lenses):**
  * **Pain Points & Challenges:** Focuses on current hurdles, regulatory fines, or operational inefficiencies.
  * **Strategic Opportunities:** Focuses on capital expenditure plans, grid modernization, and clean energy transitions.
  * **Conferences & Events:** Identifies upcoming industry events the company is attending or sponsoring.
  * **Strategic Timeline:** Generates a chronological summary of future projections and milestones.
* **Timeline Horizon (Conditional):**
  * Only visible when "Strategic Timeline" is selected.
  * Dropdown to select a specific year (Current Year to Current Year + 5) OR "Next 5 Years" (default).
  * *Logic:* If a specific year is selected, the timeline restricts events to that exact calendar year. If "Next 5 Years" is selected, it pulls events from today to 5 years in the future.
* **Persona & Skillset Profiling:**
  * Users can input their specific role, capabilities, and skillsets (e.g., "Cloud Architect specializing in Azure", "Financial Strategist").
  * The AI dynamically adjusts its narrative, terminology, and highlighted opportunities to match the user's expertise, speaking their language and framing high-level news into actionable storylines relevant to their specific skills.

### 3.2. AI Generation & Output Display (Main Dashboard)
* **Chat-Interface Paradigm:** Users can generate reports and ask follow-up questions in a continuous thread.
* **Context Upload:** Users can attach text/document files to provide custom context to the AI before generation.
* **Markdown Rendering:** The AI's text response must be rendered with rich formatting (headers, bolding, lists).
* **OpCo Segmentation:** If multiple OpCos are selected, the report must dynamically break down the analysis section-by-section for each OpCo.
* **Timeline Visualization:** 
  * When in Timeline mode, events are rendered in a vertical, chronological UI component.
  * Data points include: Date, Title, Description, and the associated OpCo.
* **Key Strategic Contacts:**
  * The AI identifies relevant stakeholders based on the generated insights.
  * Displays Contact Name, Title, Relevance (why they matter to the specific insight), and a generated LinkedIn search URL.
  * Includes a 1-click "Ask AI" button to generate an outreach strategy for that specific contact.
* **Sources & References:**
  * Extracts and deduplicates grounding URLs provided by the AI's search tool.
  * Displays clickable cards with the source title and URL.

### 3.3. Export Functionality
* **PDF Export:** Converts the generated report dashboard into a paginated PDF document.
* **Word Export:** Converts the generated report into a `.doc` format with basic HTML styling for easy editing.
* **Naming Convention:** `Wintel_Report_[YYYYMMDD_HHmm].[pdf/doc]`

## 4. Technical Architecture

### 4.1. Frontend Stack
* **Framework:** React 18+ (Vite)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Animations:** Framer Motion (`motion/react`)
* **Markdown:** `react-markdown`
* **Export Libraries:** `html2canvas`, `jspdf`

### 4.2. AI & Data Integration
* **Provider:** Google Gemini API (`@google/genai`)
* **Model:** `gemini-3-flash-preview` (or equivalent capable model).
* **Grounding:** Google Search Grounding must be enabled to fetch real-time news, regulatory filings, and event data.
* **Structured Outputs (JSON Schema):**
  * **Contacts:** The AI must return an array of objects containing `name`, `title`, `relevance`, and `linkedinUrl`.
  * **Timeline Events:** The AI must return an array of objects containing `date`, `title`, `description`, and `opco`.

## 5. Data Models & Schemas

### 5.1. Timeline Event Schema
```typescript
interface TimelineEvent {
  date: string;       // e.g., "Q3 2026" or "2026-08-15"
  title: string;      // Short, punchy milestone title
  description: string;// Detailed impact description
  opco: string;       // Specific OpCo or "Industry Wide"
}
```

### 5.2. Contact Schema
```typescript
interface Contact {
  name: string;
  title: string;
  relevance: string;  // Why this person is relevant to the generated report
  linkedinUrl: string;// e.g., "https://www.linkedin.com/search/results/people/?keywords=..."
}
```

## 6. Non-Functional Requirements
* **Performance:** AI generation should stream or provide loading states (spinners) to indicate background processing. Timeline and Contact extraction should occur in parallel or immediately following the main text generation.
* **Responsiveness:** The layout must be fluid. The sidebar should be collapsible to maximize reading space on smaller screens.
* **Print Optimization:** The UI must include `print:` Tailwind modifiers to hide the sidebar, header, and interactive buttons when exporting to PDF or printing.
* **Error Handling:** Graceful error boundaries and toast/alert messages if the AI fails to generate or if the timeline/contact JSON parsing fails.
