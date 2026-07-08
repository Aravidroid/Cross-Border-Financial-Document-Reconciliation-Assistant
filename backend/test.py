import json
from pprint import pprint

from app.services.ai_service import ai_service
from app.services.gemini_service import gemini_service

# ==========================================================
# CHANGE THIS
# ==========================================================

S3_KEY = "invoices/fc260113-0328-4f21-919f-907b4d7c19c9.pdf"

# ==========================================================
# TEST PIPELINE
# ==========================================================


def main():

    print("=" * 80)
    print("ICFDRA AI PIPELINE TEST")
    print("=" * 80)

    # ------------------------------------------------------
    # OCR
    # ------------------------------------------------------

    print("\n[1/3] Running PaddleOCR...\n")

    ocr_result = ai_service.extract_text(S3_KEY)

    print("OCR SUCCESS")
    print(f"Pages          : {ocr_result['page_count']}")
    print(f"Confidence     : {ocr_result['confidence']}%")

    print("\nExtracted Text\n")
    print("-" * 80)
    print(ocr_result["text"])
    print("-" * 80)

    # ------------------------------------------------------
    # Gemini Extraction
    # ------------------------------------------------------

    print("\n[2/3] Running Gemini Extraction...\n")

    invoice_json = gemini_service.extract_invoice(
        ocr_result["text"]
    )

    print("GEMINI SUCCESS")

    print("\nStructured Invoice\n")

    print(json.dumps(invoice_json, indent=4))

    # ------------------------------------------------------
    # Risk Analysis
    # ------------------------------------------------------

    print("\n[3/3] Running AI Risk Analysis...\n")

    report = gemini_service.generate_risk_report(
        invoice_json
    )

    print("RISK ANALYSIS SUCCESS\n")

    print(report)

    # ------------------------------------------------------

    print("\n")
    print("=" * 80)
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":

    try:

        main()

    except Exception as e:

        print("\n")

        print("=" * 80)
        print("PIPELINE FAILED")
        print("=" * 80)

        print(type(e).__name__)
        print(e)