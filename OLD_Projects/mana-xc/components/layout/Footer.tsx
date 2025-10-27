// components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t-2 border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} Mana XC. Built for the running community.
        </p>
      </div>
    </footer>
  );
}