import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError

from app.config import settings


class StorageService:
    def __init__(self):
        self.bucket_name = settings.AWS_BUCKET_NAME

        self.s3 = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    # =====================================================
    # Upload File
    # =====================================================

    def upload_file(self, file: BinaryIO, filename: str) -> str:
        """
        Uploads a file to Amazon S3.

        Returns:
            S3 Object Key
        """

        extension = Path(filename).suffix

        unique_filename = f"invoices/{uuid.uuid4()}{extension}"

        self.s3.upload_fileobj(
            Fileobj=file,
            Bucket=self.bucket_name,
            Key=unique_filename,
        )

        return unique_filename

    # =====================================================
    # Download File
    # =====================================================

    def download_file(self, s3_key: str) -> bytes:
        """
        Downloads a file from S3.
        """

        response = self.s3.get_object(
            Bucket=self.bucket_name,
            Key=s3_key,
        )

        return response["Body"].read()

    # =====================================================
    # Delete File
    # =====================================================

    def delete_file(self, s3_key: str):
        """
        Deletes a file from S3.
        """

        self.s3.delete_object(
            Bucket=self.bucket_name,
            Key=s3_key,
        )

    # =====================================================
    # Generate Presigned URL
    # =====================================================

    def generate_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600,
    ) -> str:
        """
        Generates a temporary download URL.
        """

        return self.s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": s3_key,
            },
            ExpiresIn=expiration,
        )

    # =====================================================
    # Check File Exists
    # =====================================================

    def file_exists(self, s3_key: str) -> bool:

        try:

            self.s3.head_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )

            return True

        except ClientError:

            return False


storage_service = StorageService()