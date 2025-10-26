#!/bin/bash
# Setup script for ManaXC data importers

echo "🚀 ManaXC Importer Setup"
echo "=========================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "   Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment (optional but recommended)
echo ""
echo "📦 Setting up virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "⏭️  Virtual environment already exists"
fi

echo ""
echo "To activate the virtual environment, run:"
echo "  source venv/bin/activate"
echo ""

# Install dependencies
echo "📚 Installing dependencies..."
if [ -f "venv/bin/pip" ]; then
    venv/bin/pip install -r requirements.txt
else
    pip3 install -r requirements.txt
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Supabase credentials"
    echo ""
    echo "To get your credentials:"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to Settings → API"
    echo "  4. Copy the URL and anon/public key to .env"
    echo ""
else
    echo "⏭️  .env file already exists"
fi

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Supabase credentials"
echo "  2. Test with: python3 import_courses.py --dry-run --limit 5"
echo "  3. Import data: python3 import_courses.py"
