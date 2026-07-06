from sqlalchemy import text

from app.config import settings
from app.database import engine


def test_database():
    print("=" * 60)
    print("ICFDRA Database Connection Test")
    print("=" * 60)

    print(f"Database URL: {settings.DATABASE_URL}")

    try:
        with engine.connect() as connection:
            print("\n✅ Connected successfully!")

            # PostgreSQL version
            version = connection.execute(
                text("SELECT version();")
            ).scalar()

            print(f"\nPostgreSQL Version:\n{version}")

            # Current database
            database = connection.execute(
                text("SELECT current_database();")
            ).scalar()

            print(f"\nDatabase: {database}")

            # Current schema
            schema = connection.execute(
                text("SELECT current_schema();")
            ).scalar()

            print(f"Schema: {schema}")

            # List all tables
            tables = connection.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema='public'
                    ORDER BY table_name;
                """)
            ).fetchall()

            print("\nTables:")

            if not tables:
                print("No tables found.")
            else:
                for table in tables:
                    print(f"  • {table[0]}")

        print("\n✅ Database test completed successfully.")

    except Exception as e:
        print("\n❌ Database connection failed!")
        print(e)


if __name__ == "__main__":
    test_database()