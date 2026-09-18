from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data" / "historical"

print("=" * 60)
print("WeatherGPT - Historical Dataset Test")
print("=" * 60)

print("\nData folder:")
print(DATA_DIR)

if not DATA_DIR.exists():
    print("\nERROR: historical folder nahi mila!")
    raise SystemExit(1)

csv_files = list(DATA_DIR.glob("*.csv"))

if not csv_files:
    print("\nERROR: historical folder mein koi CSV file nahi mili!")
    raise SystemExit(1)

print("\nCSV files found:")

for file in csv_files:
    print(f"  - {file.name}")

print("\n" + "=" * 60)

for file in csv_files:
    print(f"\nFILE: {file.name}")
    print("-" * 60)

    try:
        df = pd.read_csv(file)

        print(f"Rows: {len(df)}")
        print(f"Columns: {len(df.columns)}")

        print("\nColumn names:")
        for column in df.columns:
            print(f"  - {column}")

        print("\nFirst 5 rows:")
        print(df.head().to_string(index=False))

        print("\nDataset loaded successfully!")

    except Exception as e:
        print(f"\nERROR while reading {file.name}:")
        print(e)

print("\n" + "=" * 60)
print("Dataset test completed.")
print("=" * 60)