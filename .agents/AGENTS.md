# ICFDRA Project Rules & Context

This document outlines the project context, vision, architecture, and guidelines for the **Intelligent Cross-Border Financial Compliance & Risk Intelligence Platform (ICFDRA)**. All future development must align with these rules and priorities.

## Project Vision
ICFDRA is an enterprise AI platform that:
1. Automates cross-border financial document processing.
2. Validates financial accuracy.
3. Checks regulatory compliance.
4. Evaluates vendor trustworthiness.
5. Provides financial health insights.
6. Assists finance teams in making informed approval decisions.

---

## Architectural Rules
- **Modular Business Logic**: Business logic must remain modular and separated into dedicated services.
- **CRUD Operations**: All invoice CRUD operations must reside in [invoice_service.py](file:///c:/Projects/ICFDRA/backend/app/services/invoice_service.py).
- **Processing Orchestration**: Orchestration of background processing belongs in `processing_service.py`. *Never place orchestration logic inside CRUD services.*
- **OCR Logic**: OCR operations remain in [ai_service.py](file:///c:/Projects/ICFDRA/backend/app/services/ai_service.py).
- **Gemini (AI) Logic**: AI model interaction and LLM prompting/extraction belongs in [gemini_service.py](file:///c:/Projects/ICFDRA/backend/app/services/gemini_service.py).
- **Validation Logic**: Core financial calculations, arithmetic verification, and matching logic belongs in `validation_service.py`.
- **Compliance Logic**: Regulatory and country-specific checks belong in `compliance_service.py`.

---

## Design Principles
- **Deterministic Validation (Math Firewall)**: The platform must rely on deterministic validation for financial calculations. AI is used for data extraction, explanations, recommendations, and insights, but **never** as the final authority for financial correctness.
- **Enterprise-Grade Quality**: All code, configurations, and architecture must follow clean code principles, scalability, modularity, and production-ready design patterns.

---

## Future Development Priorities

1. **Financial Validation Engine (Math Firewall)**
   - Validate line totals, subtotals, tax, shipping, and grand totals.
   - Detect duplicate invoices.
   - Perform currency and decimal validation.

2. **Regulatory Compliance Checker**
   - Mandatory field validation.
   - Country-specific invoice compliance.
   - VAT/GST/Tax ID validation.
   - Invoice numbering rules.
   - Compute compliance scores.

3. **Vendor Trust Engine**
   - Track and compute Vendor Trust Scores.
   - Analyze historical payment behavior, duplicate invoice history, and compliance history.
   - Highlight fraud indicators.

4. **AI Financial Health Advisor**
   - Compute Financial Health Score.
   - Assess cash flow impact and spending trends.
   - Offer payment and AI approval recommendations.

5. **FX Intelligence**
   - Track live exchange rates.
   - Compute FX gain/loss and FX exposure.
   - Advise on optimal payment timing.

6. **Semantic Search (pgvector)**
   - Enable similarity search across documents.

7. **Conversational BI (Text-to-SQL)**
   - Natural language queries over financial data.

8. **Executive Dashboard & Live Analytics**
   - Visualizing KPIs and compliance metrics.
