import json
import logging
import re
from google import genai
from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY
        )

        self.model = "gemini-2.5-flash"

    # =====================================================
    # Extract Invoice
    # =====================================================

    def extract_invoice(self, ocr_text: str) -> dict:
        """
        Convert OCR text into structured invoice JSON.
        """

        prompt = f"""
You are an expert financial document parser.

Extract the invoice into JSON.

Return ONLY valid JSON.

Fields:

{{
    "vendor_name":"",
    "vendor_country":"",
    "invoice_number":"",
    "invoice_date":"",
    "currency":"",
    "payment_terms":"",
    "subtotal":0,
    "tax":0,
    "total":0,

    "items":[
        {{
            "description":"",
            "quantity":0,
            "unit_price":0,
            "line_total":0
        }}
    ]
}}

OCR TEXT:

{ocr_text}
"""

        try:

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )

            text = response.text.strip()

            # Remove Markdown code fences
            text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"^```\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

            print("\nGemini Response:\n")
            print(text)

            return json.loads(text)

        except Exception as e:

            logger.exception("Gemini Extraction Failed")

            raise Exception(
                f"Gemini extraction failed: {e}"
            )

    # =====================================================
    # Risk Analysis
    # =====================================================

    def generate_risk_report(
        self,
        invoice_json: dict,
    ) -> str:

        prompt = f"""
You are a Senior Financial Risk Analyst.

Analyze the following invoice and return a very concise risk assessment.
Do NOT use any Markdown formatting (no asterisks, headers, bold text, bullet points, or numbering). Return ONLY plain text.
Keep it very short (maximum 3-4 sentences in a single short paragraph).

Briefly cover:
- Fraud indicators
- Financial risks
- Compliance issues
- Duplicate invoice possibility
- Currency risks

Invoice:

{json.dumps(invoice_json, indent=2)}
"""

        try:

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )

            return response.text

        except Exception as e:

            logger.exception("Risk Analysis Failed")

            raise Exception(
                f"Risk generation failed: {e}"
            )

gemini_service = GeminiService()