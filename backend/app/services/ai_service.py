from __future__ import annotations

import logging
import threading
from io import BytesIO
from pathlib import Path
from typing import Any

import cv2
import fitz  # PyMuPDF
import numpy as np
from numpy.typing import NDArray

from app.services.storage_service import storage_service

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------


class AIServiceError(Exception):
    """Base exception for all AI-service failures."""


class FileDownloadError(AIServiceError):
    """Raised when the file cannot be retrieved from S3."""


class UnsupportedFileTypeError(AIServiceError):
    """Raised when the file type is neither a supported image nor PDF."""


class PDFConversionError(AIServiceError):
    """Raised when a PDF page cannot be rendered to an image."""


class ImagePreprocessingError(AIServiceError):
    """Raised when OpenCV preprocessing fails."""


class OCREngineError(AIServiceError):
    """Raised when PaddleOCR initialization or inference fails."""


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# PDF rendering DPI — 300 DPI gives a good balance of quality / memory.
_PDF_RENDER_DPI: int = 300

# Maximum image dimension (width or height) fed into OCR.  Larger images are
# proportionally down-scaled to keep memory and latency under control.
_MAX_OCR_DIMENSION: int = 4096

# Supported image extensions (used as a fallback after magic-byte detection).
_IMAGE_EXTENSIONS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp",
})

# Magic-byte signatures for file-type detection.
_PDF_MAGIC: bytes = b"%PDF"
_PNG_MAGIC: bytes = b"\x89PNG"
_JPEG_MAGIC: bytes = b"\xff\xd8\xff"
_BMP_MAGIC: bytes = b"BM"
_TIFF_MAGIC_LE: bytes = b"II"
_TIFF_MAGIC_BE: bytes = b"MM"
_WEBP_MAGIC: bytes = b"RIFF"


# ---------------------------------------------------------------------------
# AIService
# ---------------------------------------------------------------------------


class AIService:
    """
    Encapsulates all OCR operations behind a clean, production-ready API.

    The PaddleOCR engine is **lazy-loaded** on first call and shared for the
    lifetime of the process (singleton via a class-level lock).
    """

    # Class-level singleton for PaddleOCR engine.
    _ocr_engine: Any | None = None
    _ocr_lock: threading.Lock = threading.Lock()

    # =====================================================
    # Public API
    # =====================================================

    def extract_text(self, s3_key: str) -> dict[str, Any]:
        """
        End-to-end OCR pipeline.

        Parameters
        ----------
        s3_key:
            The S3 object key of the uploaded file (image or PDF).

        Returns
        -------
        dict with keys ``text``, ``pages``, ``confidence``, ``boxes``,
        ``page_count``.

        Raises
        ------
        FileDownloadError
            If the file cannot be downloaded from S3.
        UnsupportedFileTypeError
            If the file is not a recognised image or PDF.
        PDFConversionError
            If a PDF page fails to render.
        ImagePreprocessingError
            If OpenCV preprocessing fails.
        OCREngineError
            If PaddleOCR fails during initialisation or inference.
        """

        logger.info("OCR pipeline started for S3 key '%s'", s3_key)

        # 1. Download -------------------------------------------------------
        raw_bytes = self._download_file(s3_key)

        # 2. Detect type & extract page images ------------------------------
        page_images = self._file_to_images(raw_bytes, s3_key)
        logger.info(
            "Prepared %d page image(s) for OCR from '%s'",
            len(page_images),
            s3_key,
        )

        # 3. Preprocess & OCR each page ------------------------------------
        all_pages: list[dict[str, Any]] = []
        all_boxes: list[dict[str, Any]] = []

        for page_idx, img in enumerate(page_images, start=1):
            preprocessed = self._preprocess_image(img, page_idx)
            page_result = self._run_ocr(preprocessed, page_idx)

            all_pages.append(page_result)
            all_boxes.extend(page_result.pop("_boxes"))

        # 4. Merge results --------------------------------------------------
        merged = self._merge_results(all_pages, all_boxes)
        logger.info(
            "OCR pipeline completed for '%s' — %d page(s), avg confidence %.2f%%",
            s3_key,
            merged["page_count"],
            merged["confidence"],
        )
        return merged

    # =====================================================
    # Step 1 — S3 Download
    # =====================================================

    def _download_file(self, s3_key: str) -> bytes:
        """Download the raw file bytes from S3."""

        logger.info("Downloading file from S3: '%s'", s3_key)
        try:
            data: bytes = storage_service.download_file(s3_key)
        except Exception as exc:
            logger.error(
                "Failed to download S3 key '%s': %s", s3_key, exc,
            )
            raise FileDownloadError(
                f"Could not download file from S3 (key={s3_key}): {exc}"
            ) from exc

        logger.info(
            "Downloaded %d bytes from S3 key '%s'", len(data), s3_key,
        )
        return data

    # =====================================================
    # Step 2 — File → Page Images
    # =====================================================

    def _file_to_images(
        self,
        raw_bytes: bytes,
        s3_key: str,
    ) -> list[NDArray[np.uint8]]:
        """
        Detect file type and return a list of OpenCV images (one per page).
        """

        file_type = self._detect_file_type(raw_bytes, s3_key)

        if file_type == "pdf":
            return self._pdf_to_images(raw_bytes)

        # Single image
        return [self._bytes_to_cv_image(raw_bytes)]

    @staticmethod
    def _detect_file_type(raw_bytes: bytes, s3_key: str) -> str:
        """
        Return ``"pdf"`` or ``"image"`` based on magic bytes, falling back to
        the file extension.

        Raises
        ------
        UnsupportedFileTypeError
            If neither heuristic succeeds.
        """

        header = raw_bytes[:12]

        # Check magic bytes first (most reliable).
        if header[:4] == _PDF_MAGIC:
            logger.debug("Detected PDF via magic bytes.")
            return "pdf"

        if (
            header[:4] == _PNG_MAGIC
            or header[:3] == _JPEG_MAGIC
            or header[:2] == _BMP_MAGIC
            or header[:2] in (_TIFF_MAGIC_LE, _TIFF_MAGIC_BE)
            or (header[:4] == _WEBP_MAGIC and header[8:12] == b"WEBP")
        ):
            logger.debug("Detected image via magic bytes.")
            return "image"

        # Fallback — file extension
        ext = Path(s3_key).suffix.lower()
        if ext == ".pdf":
            logger.debug("Detected PDF via file extension.")
            return "pdf"
        if ext in _IMAGE_EXTENSIONS:
            logger.debug("Detected image via file extension '%s'.", ext)
            return "image"

        logger.error(
            "Unsupported file type for S3 key '%s' (ext=%s).", s3_key, ext,
        )
        raise UnsupportedFileTypeError(
            f"File '{s3_key}' is not a supported image or PDF."
        )

    # =====================================================
    # Step 2a — PDF to Images (PyMuPDF)
    # =====================================================

    @staticmethod
    def _pdf_to_images(pdf_bytes: bytes) -> list[NDArray[np.uint8]]:
        """
        Render every page of a PDF to a high-resolution RGB numpy array.
        """

        images: list[NDArray[np.uint8]] = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            logger.error("Failed to open PDF document: %s", exc)
            raise PDFConversionError(
                f"Could not open PDF document: {exc}"
            ) from exc

        total_pages = len(doc)
        logger.info("PDF contains %d page(s). Rendering at %d DPI.", total_pages, _PDF_RENDER_DPI)

        zoom = _PDF_RENDER_DPI / 72  # 72 is the default PDF DPI
        matrix = fitz.Matrix(zoom, zoom)

        for page_num in range(total_pages):
            try:
                page = doc.load_page(page_num)
                pix = page.get_pixmap(matrix=matrix, alpha=False)

                # Convert fitz.Pixmap → numpy array (RGB)
                img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                    pix.height, pix.width, 3,
                )
                images.append(img.copy())  # copy to detach from pixmap buffer

                logger.debug(
                    "Rendered PDF page %d/%d → %dx%d",
                    page_num + 1,
                    total_pages,
                    pix.width,
                    pix.height,
                )
            except Exception as exc:
                logger.error(
                    "Failed to render PDF page %d: %s", page_num + 1, exc,
                )
                raise PDFConversionError(
                    f"Failed to render PDF page {page_num + 1}: {exc}"
                ) from exc

        doc.close()
        return images

    # =====================================================
    # Step 2b — Raw Bytes to OpenCV Image
    # =====================================================

    @staticmethod
    def _bytes_to_cv_image(raw_bytes: bytes) -> NDArray[np.uint8]:
        """Decode raw image bytes into a BGR OpenCV array."""

        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            logger.error("OpenCV failed to decode the image bytes.")
            raise UnsupportedFileTypeError(
                "The file could not be decoded as an image."
            )

        logger.debug("Decoded image: %dx%d", img.shape[1], img.shape[0])
        return img

    # =====================================================
    # Step 3 — Image Preprocessing (OpenCV)
    # =====================================================

    @staticmethod
    def _preprocess_image(
        img: NDArray[np.uint8],
        page_num: int,
    ) -> NDArray[np.uint8]:
        """
        Apply a standard preprocessing pipeline to improve OCR accuracy:

        1. Convert to grayscale.
        2. Non-local means denoising.
        3. Adaptive Gaussian thresholding.
        4. Down-scale if either dimension exceeds ``_MAX_OCR_DIMENSION``.

        Returns the preprocessed image as a 3-channel BGR array (PaddleOCR
        expects colour input even when the content is grayscale).
        """

        try:
            h, w = img.shape[:2]
            logger.debug(
                "Preprocessing page %d — input size %dx%d", page_num, w, h,
            )

            # 1. Grayscale
            if len(img.shape) == 3 and img.shape[2] == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img

            # 2. Denoise
            denoised = cv2.fastNlMeansDenoising(
                gray,
                h=10,
                templateWindowSize=7,
                searchWindowSize=21,
            )

            # 3. Adaptive threshold
            binary = cv2.adaptiveThreshold(
                denoised,
                maxValue=255,
                adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                thresholdType=cv2.THRESH_BINARY,
                blockSize=15,
                C=8,
            )

            # 4. Resize if necessary
            h, w = binary.shape[:2]
            if max(h, w) > _MAX_OCR_DIMENSION:
                scale = _MAX_OCR_DIMENSION / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                binary = cv2.resize(
                    binary,
                    (new_w, new_h),
                    interpolation=cv2.INTER_AREA,
                )
                logger.debug(
                    "Resized page %d from %dx%d → %dx%d",
                    page_num, w, h, new_w, new_h,
                )

            # Convert back to 3-channel for PaddleOCR.
            result = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

            logger.debug("Preprocessing complete for page %d.", page_num)
            return result

        except Exception as exc:
            logger.error(
                "Image preprocessing failed for page %d: %s", page_num, exc,
            )
            raise ImagePreprocessingError(
                f"Preprocessing failed on page {page_num}: {exc}"
            ) from exc

    # =====================================================
    # Step 4 — PaddleOCR (Lazy Singleton)
    # =====================================================

    @classmethod
    def _get_ocr_engine(cls) -> Any:
        """
        Return the shared PaddleOCR engine, initialising it exactly once.

        Uses a double-checked locking pattern for thread safety.
        """

        if cls._ocr_engine is not None:
            return cls._ocr_engine

        with cls._ocr_lock:
            # Double-check after acquiring the lock.
            if cls._ocr_engine is not None:
                return cls._ocr_engine

            logger.info("Initializing PaddleOCR engine (first call)…")
            try:
                from paddleocr import PaddleOCR  # noqa: WPS433

                cls._ocr_engine = PaddleOCR(
                    use_angle_cls=True,
                    lang="en",
                    show_log=False,
                    use_gpu=False,
                )
                logger.info("PaddleOCR engine initialized successfully.")
            except Exception as exc:
                logger.error(
                    "PaddleOCR initialization failed: %s", exc,
                )
                raise OCREngineError(
                    f"Failed to initialize PaddleOCR: {exc}"
                ) from exc

        return cls._ocr_engine

    def _run_ocr(
        self,
        img: NDArray[np.uint8],
        page_num: int,
    ) -> dict[str, Any]:
        """
        Execute OCR on a single preprocessed image and return structured
        per-page results.

        Returns
        -------
        dict with keys ``page``, ``text``, ``lines``, ``confidence``,
        and a private ``_boxes`` list (consumed by the merger).
        """

        logger.info("Running OCR on page %d…", page_num)

        engine = self._get_ocr_engine()

        try:
            results = engine.ocr(img, cls=True)
        except Exception as exc:
            logger.error("OCR inference failed on page %d: %s", page_num, exc)
            raise OCREngineError(
                f"OCR inference failed on page {page_num}: {exc}"
            ) from exc

        lines: list[dict[str, Any]] = []
        boxes: list[dict[str, Any]] = []
        confidences: list[float] = []

        # PaddleOCR returns a list of list of tuples:
        #   [ [ ([box], (text, score)), … ] ]
        # Outer list has one entry per image; inner list has one per text line.
        if results and results[0]:
            for detection in results[0]:
                box_coords = detection[0]           # [[x1,y1], …, [x4,y4]]
                text_str: str = detection[1][0]      # detected text
                score: float = float(detection[1][1])  # confidence 0-1

                lines.append({
                    "text": text_str,
                    "confidence": round(score * 100, 2),
                })

                boxes.append({
                    "page": page_num,
                    "box": box_coords,
                    "text": text_str,
                    "score": round(score * 100, 2),
                })

                confidences.append(score)

        page_text = "\n".join(line["text"] for line in lines)
        avg_conf = (
            round((sum(confidences) / len(confidences)) * 100, 2)
            if confidences
            else 0.0
        )

        logger.info(
            "Page %d — %d line(s) detected, avg confidence %.2f%%",
            page_num,
            len(lines),
            avg_conf,
        )

        return {
            "page": page_num,
            "text": page_text,
            "lines": lines,
            "confidence": avg_conf,
            "_boxes": boxes,   # stripped during merge
        }

    # =====================================================
    # Step 5 — Merge All Pages
    # =====================================================

    @staticmethod
    def _merge_results(
        pages: list[dict[str, Any]],
        boxes: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Combine per-page OCR outputs into a single response dict.
        """

        full_text_parts: list[str] = []
        weighted_confidence_sum: float = 0.0
        total_lines: int = 0

        for page in pages:
            page_line_count = len(page["lines"])
            full_text_parts.append(page["text"])
            weighted_confidence_sum += page["confidence"] * page_line_count
            total_lines += page_line_count

        full_text = "\n\n".join(full_text_parts)
        avg_confidence = (
            round(weighted_confidence_sum / total_lines, 2)
            if total_lines
            else 0.0
        )

        return {
            "text": full_text,
            "pages": pages,
            "confidence": avg_confidence,
            "boxes": boxes,
            "page_count": len(pages),
        }

ai_service = AIService()